
const validator =
    require('validator');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');


// =====================================================
// Validate Password
// =====================================================

const validate_password = (
    password_field = 'password'
) => {

    return (req, res, next) => {

        const password =
            req.body[password_field];


        // =================================================
        // Password Required
        // =================================================

        if (!password) {

            const error =
                new app_error();

            error.create(
                `${password_field} is required`,
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Password Strength
        // =================================================

        const is_strong =
            validator.isStrongPassword(
                password,
                {
                    minLength: 8,
                    minLowercase: 1,
                    minUppercase: 1,
                    minNumbers: 1,
                    minSymbols: 1
                }
            );


        if (!is_strong) {

            const error =
                new app_error();

            error.create(
                'password is weak! It must contain at least 8 characters including uppercase, lowercase, number and symbol',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        return next();
    };
};


module.exports =
    validate_password;

