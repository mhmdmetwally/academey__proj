
const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');


module.exports = (...allowedroles) => {

    return (req, res, next) => {

        const cur_role =
            req.user.role;


        /*
        Check Active Status

        is_active must come from VerifyToken
        after checking the database.

        It should NOT come from the JWT itself.
        */

        if (
            req.user.is_active === false
        ) {

            const error =
                new app_error();

            error.create(

                `${cur_role} is not active`,

                403,

                http_status_text.FAIL

            );

            return next(error);

        }


        /*
        Check Role
        */

        if (
            allowedroles.includes(cur_role)
        ) {

            return next();

        }


        /*
        Role Not Allowed
        */

        const error =
            new app_error();

        error.create(

            `${cur_role} not allowed to make this action`,

            403,

            http_status_text.FAIL

        );

        return next(error);

    };

};

