const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app_error = require('../utils/AppError');
const http_status_text = require('../utils/HttpStatusText');

const Academy = require('../models/Academy');
const Supervisor = require('../models/Supervisor');
const User = require('../models/User');
const user_role = require('../utils/UserRole');

const JWT_SECRET = process.env.JWT_SECRET;

// =====================================================
// Verify Token
// =====================================================
const verify_token = async (req, res, next) => {
    const auth_header = req.headers['authorization'];

    // 1. Token Required
    if (!auth_header) {
        const error = new app_error();
        error.create('required token', 401, http_status_text.ERROR);
        return next(error);
    }

    // 2. Bearer Token Format
    const parts = auth_header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        const error = new app_error();
        error.create('invalid authorization header', 401, http_status_text.ERROR);
        return next(error);
    }

    const token = parts[1];

    // 3. Verify JWT
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = decoded.payload || decoded;

        if (!user.id || !user.role) {
            const error = new app_error();
            error.create('invalid token payload', 401, http_status_text.ERROR);
            return next(error);
        }

        let detected_academy_id = user.academy_id;

        // --- Academy Admin ---
        if (user.role === user_role.academy_admin) {
            const academy = await Academy.findById(user.id).select('_id is_active');

            if (!academy) {
                const error = new app_error();
                error.create('academy not found', 401, http_status_text.ERROR);
                return next(error);
            }

            if (academy.is_active !== true) {
                const error = new app_error();
                error.create('academy is not active', 403, http_status_text.FAIL);
                return next(error);
            }

            detected_academy_id = academy._id;
        }

        // --- Supervisor ---
        else if (user.role === user_role.supervisor) {
            const supervisor = await Supervisor.findOne({
                user: user.id,
                is_active: true
            }).select('_id user academy_id is_active');

            if (!supervisor) {
                const error = new app_error();
                error.create('supervisor is not active', 403, http_status_text.FAIL);
                return next(error);
            }

            // ✅ حفظ القيمة في المتغير المخصص
            detected_academy_id = supervisor.academy_id;
        }

        // --- User / Family ---
        else if (user.role === user_role.user) {
            const current_user = await User.findById(user.id).select('_id is_active academy_id');

            if (!current_user) {
                const error = new app_error();
                error.create('user not found', 401, http_status_text.ERROR);
                return next(error);
            }

            if (current_user.is_active !== true) {
                const error = new app_error();
                error.create('user is not active', 403, http_status_text.FAIL);
                return next(error);
            }

            detected_academy_id = current_user.academy_id || detected_academy_id;
        }

        // --- Super Admin ---
        else if (user.role === user_role.super_admin) {
            // No action needed
        }

        // --- Unknown Role ---
        else {
            const error = new app_error();
            error.create('invalid user role', 403, http_status_text.FAIL);
            return next(error);
        }

        // 4. Save User Data to Request Object safely
        req.user = {
            id: user.id,
            role: user.role,
            academy_id: detected_academy_id
        };

        return next();

    } catch (error) {
        // لو التوكن منتهي أو غير صالح فقط
        const auth_error = new app_error();
        auth_error.create('invalid token', 401, http_status_text.ERROR);
        return next(auth_error);
    }
};

module.exports = verify_token;