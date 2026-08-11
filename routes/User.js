const express = require('express');

const user_controller =
    require('../controllers/User');

const validate_password =
    require('../middleware/ValidatePassword');

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


module.exports = router;

