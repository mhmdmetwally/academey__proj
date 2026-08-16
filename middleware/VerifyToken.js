const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app_error = require('../utils/AppError');
const http_status_text = require('../utils/HttpStatusText');
const Academy = require('../models/Academy');
const Supervisor = require('../models/Supervisor');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const user_role = require('../utils/UserRole');

const JWT_SECRET = process.env.JWT_SECRET;

const hash_token = (token) => crypto.createHash('sha256').update(token).digest('hex');

const verify_token = async (req, res, next) => {
    const auth_header = req.headers['authorization'];

    if (!auth_header) {
        const error = new app_error();
        error.create('required token', 401, http_status_text.ERROR);
        return next(error);
    }

    const parts = auth_header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        const error = new app_error();
        error.create('invalid authorization header', 401, http_status_text.ERROR);
        return next(error);
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const token_hash = hash_token(token);
        const blacklisted_token = await BlacklistedToken.findOne({ token_hash });
        if (blacklisted_token) {
            const error = new app_error();
            error.create('token has been revoked', 401, http_status_text.ERROR);
            return next(error);
        }

        const user = decoded.payload || decoded;
        const userId = user.id || user._id;

        if (!userId || !user.role) {
            const error = new app_error();
            error.create('invalid token payload', 401, http_status_text.ERROR);
            return next(error);
        }

        let detected_academy_id = user.academy_id;
        let is_user_active = true;

        if (user.role === user_role.academy_admin) {
            const academy = await Academy.findById(userId).select('_id is_active');
            if (!academy) {
                const error = new app_error();
                error.create('academy not found', 401, http_status_text.ERROR);
                return next(error);
            }
            if (!academy.is_active) {
                const error = new app_error();
                error.create('academy is not active', 403, http_status_text.FAIL);
                return next(error);
            }
            detected_academy_id = academy._id;
            is_user_active = academy.is_active;
        } else if (user.role === user_role.supervisor) {
            const supervisor = await Supervisor.findOne({ user: userId, is_active: true }).select('_id user academy_id is_active');
            if (!supervisor) {
                const error = new app_error();
                error.create('supervisor is not active', 403, http_status_text.FAIL);
                return next(error);
            }
            detected_academy_id = supervisor.academy_id;
            is_user_active = supervisor.is_active;
        } else if (user.role === user_role.user) {
            const current_user = await User.findById(userId).select('_id is_active academy_id');
            if (!current_user) {
                const error = new app_error();
                error.create('user not found', 401, http_status_text.ERROR);
                return next(error);
            }
            if (!current_user.is_active) {
                const error = new app_error();
                error.create('user is not active', 403, http_status_text.FAIL);
                return next(error);
            }
            detected_academy_id = current_user.academy_id || detected_academy_id;
            is_user_active = current_user.is_active;
        } else if (user.role === user_role.super_admin) {
            // super_admin
        } else {
            const error = new app_error();
            error.create('invalid user role', 403, http_status_text.FAIL);
            return next(error);
        }

        req.user = {
            id: userId,
            role: user.role,
            academy_id: detected_academy_id,
            is_active: is_user_active
        };

        return next();
    } catch (error) {
        const auth_error = new app_error();
        auth_error.create('invalid token', 401, http_status_text.ERROR);
        return next(auth_error);
    }
};

module.exports = verify_token;