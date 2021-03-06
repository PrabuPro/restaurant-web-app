const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');


const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if(isPhoto){
            next(null, true);
        } else {
            next({message: 'That file type isn\'t  allowed'}, false);
        }
    }
}

exports.homePage = (req, res) => {
    res.render('index', {
        title: 'food site'
    });
};

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo')

exports.resize = async (req, res, next) => {
    //check if there is no file to resize
    if(!req.file) {
        next(); //skip to the next middleware
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    //now we resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    //once we have written the photo to our filesystem, keep goin
    next();     

}

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully created ${store.name}. Care to leave a review`);
    res.redirect(`/store/${store.slug}`);
    
}; 

exports.getStore = async (req, res) => {
    //adding pagination to the store page
    //below we are quering limited stores and skip others
    //we need to get the count of the all stores alss.
    //so we are using another query to count all stores
    const page = req.params.page || 1;
    const limit = 6  ;
    const skip = (page*limit)-limit;
    
    const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({created:'desc'});

    //this is to count stores
    const countPromise = Store.count();

    //getting results for both of queries useing promises
    const[stores, count] = await Promise.all([storesPromise, countPromise]);

    const pages = Math.ceil(count/limit);
    if(!stores.length && skip) {
        req.flash('info', `Hey! You asked for page ${page}. But that dosen't exist. So I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }

    res.render('stores', {title : 'Stores', stores, page, pages, count });
};


const confrimOwner = (store, user) => {
    if(!store.author.equals(user._id)){
        throw Error('You must own a store in order to edit it!');
    };
};

exports.editStore = async (req, res) => {
    //1. Find the store given the ID
    const store = await Store.findOne({ _id: req.params.id});   

    //2. confirm they are the owner of the store
    //this is not a middel ware since we need to find the store in order to check
    confrimOwner(store, req.user);

    //3. Render out the edit form so user can edit their form
    res.render('editStore', {title: `Edit ${store.name}`, store});
}

exports.updateStore = async (req, res) => {
    //1. Find the store to update
    const store = await Store.findOneAndUpdate({ _id: req.params.id}, req.body, {
        new: true, // returen the new store instead of old one
        runValidators: true
    }).exec();
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/store/${store.slug}">Veiw Store </a>`);
    //reder out the updated info
    res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoreBySlug = async (req, res) => {
    const store = await Store.findOne({
        slug: req.params.slug
    }).populate('author reviews');
    if(!store) return next();
    // res.json(store);
    res.render('store', { store, title: store.name });
}

exports.getStoreByTag = async (req, res) => {
    const tag = req.params.tag; 
    const tagQuery = tag || { $exists: true}
    const tagsPromise = Store.getTagsList();
    const storePromise = Store.find({ tags: tagQuery});
    const [tags, stores] = await Promise.all([tagsPromise, storePromise]);
    res.render('tag', { tags , title: 'Tags', tag, stores});
}
  
exports.searchStores = async(req, res) => {
    const stores = await Store
    //find the store that match
    .find({
        $text: {
            $search: req.query.q,
        }
    },{
        //give a score reffering text 
        score: {$meta: 'textScore'}
    })
    // sort it
    .sort({
        score: {$meta: 'textScore' }
    })
    //limit search result
    .limit(5);
    res.json(stores);

}

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000 // 10km
            }
        }
    };

    const store = await Store.find(q).select('slug name description location photo').limit(10);
    res.json(store);
}

exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map'});
}

exports.heartScore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'; 
    const user = await User
        .findByIdAndUpdate(req.user._id, 
        {[operator]: {hearts: req.params.id}},
        { new: true }     
    );
    res.json(user);
}

exports.heartAmount = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts}
    })
    res.render('stores', {title: 'Hearted Stores', stores});
}

exports.getTopStores = async (req, res) =>{
    const stores = await Store.getTopStores();
    res.render('topStores', {stores, title:'Top Stores!'});
}
