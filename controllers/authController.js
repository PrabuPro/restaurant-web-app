const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');


exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed login!',
    successRedirect: '/',
    successFlash: 'You now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are logged out!');
    res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated()){
        next();
        return;
    }   
    req.flash('error', 'Ooops! You must be loged in to do that');
    res.redirect('/login');
}


exports.forgot = async (req, res) => {
    //1. see if a user with that mail exists
    const user = await User.findOne({ email: req.body.email });
    if(!user) {
        req.flash('error', 'No account with that email exist')
        return res.redirect('/login')
    }
    //2. set token and expiry on their accounts
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    //3. send the email with the token
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    //4. send the mail 
    await mail.send({
        user,
        subject: 'Password Reset',
        resetURL,
        filename: 'password-reset'

    });
    req.flash('success', `You have been emailed a password reset link.`);
    //5. redirect to login page  
    res.redirect('/login');
}

exports.reset = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if(!user) {
        req.flash('error', 'Password reset token is invalid or expired');
        return res.redirect('/login');
    }
    //if there is a user show the password reset form
    res.render('reset', { title: 'Reset your password'});
}


exports.confrimPasswords = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) {
        next(); // keepit going!
        return;
    }
    req.flash('error', 'Passwords do not match!');
    res.redirect('back');
};

exports.update = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    });
    if (!user) {
        req.flash('error', 'Password reset token is invalid or expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;    
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', 'Nice, your password has been reset! You are now logged in');
    res.redirect('/');
};


