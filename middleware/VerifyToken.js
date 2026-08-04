const jwt =
    require('jsonwebtoken');

const app_error =
    require('../utils/AppError');

const JWT_SECRET =
    process.env.JWT_SECRET;

const http_status_text =
    require('../utils/HttpStatusText');


const verify_token = (
    req,
    res,
    next
) => {

    const auth_header =
        req.headers["authorization"];


    if (!auth_header) {

        const error =
            new app_error();

        error.create(
            'required token',
            401,
            http_status_text.ERROR
        );

        return next(error);
    }


    const parts =
        auth_header.split(' ');


    if (
        parts.length !== 2 ||
        parts[0] !== 'Bearer'
    ) {

        const error =
            new app_error();

        error.create(
            'invalid authorization header',
            401,
            http_status_text.ERROR
        );

        return next(error);
    }


    const token =
        parts[1];


    try {

        const decode_token =
            jwt.verify(
                token,
                JWT_SECRET
            );


        req.user =
            decode_token.payload;


        next();

    }

    catch (error) {

        const new_error =
            new app_error();

        new_error.create(
            'invalid token',
            401,
            http_status_text.ERROR
        );

        next(new_error);
    }

};


module.exports =
    verify_token;