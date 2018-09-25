const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeContorller');
const userController = require('../controllers/userContorller');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const {catchErrors} = require('../handlers/errorHandlers');


router.get('/', catchErrors(storeController.getStore));
router.get('/stores', catchErrors(storeController.getStore));
router.get('/stores/page/:page', catchErrors(storeController.getStore));
router.get('/add', authController.isLoggedIn ,storeController.addStore);

router.post('/add', 
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.createStore)
);

router.post('/add/:id', 
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.updateStore)
);

router.get('/stores/:id/edit', catchErrors(storeController.editStore));
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

router.get('/tags', catchErrors(storeController.getStoreByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoreByTag));

router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/register', userController.registerForm);
router.post('/register', 
    userController.validateRegister,
    userController.register,
    authController.login
);


router.get('/logout', authController.logout);   

router.get('/account', authController.isLoggedIn ,userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
    authController.confrimPasswords,
    catchErrors(authController.update)    
);
router.get('/map', storeController.mapPage); 
router.get('/hearts', authController.isLoggedIn ,catchErrors(storeController.heartAmount));
router.post('/reviews/:id', 
    authController.isLoggedIn, 
    catchErrors(reviewController.addReview)
);
router.get('/top', catchErrors(storeController.getTopStores));


/*
    API
*/
router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartScore));

module.exports = router; 

// router.get('/', (req, res) => {
//   const a = {name:'prabu', age:100, cool:true};
//   // res.json(a);
//   res.render('hello',{
//     name: 'prabu',
//     dog: req.query.dog,
//     title: 'I love food'   
//   });
// });

// router.get('/reverse/:name',(req, res) => {
//   const reverse = [...req.params.name].reverse().join('');  
  
// });