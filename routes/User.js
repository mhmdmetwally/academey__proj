const express = require('express');

const user_controller =
    require('../controllers/User');

const validate_password =
    require('../middleware/ValidatePassword');

const verify_token = 
    require('../middleware/VerifyToken');

const router =
    express.Router();


// =====================================================
// Register
// =====================================================



router.route('/register')
    .post(
        validate_password('password'),

        user_controller.register
    );


// =====================================================
// Login
// =====================================================

router.route('/login')
    .post(
        user_controller.login
    );

// =====================================================
// Logout

// =====================================================

 router.route('/logout')
    .post(

        verify_token,

        user_controller.logout

    );   

module.exports = router;

