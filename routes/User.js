const express = require('express');

const user_controller =
    require('../controllers/User');

const router =
    express.Router();


// =====================================================
// Register
// =====================================================

router.route('/register')
    .post(
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

