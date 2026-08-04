class AppError extends Error {

    constructor(message = '', status_code = 500, status_text = 'error') {

        super(message);

        this.status_code = status_code;
        this.status_text = status_text;

        Error.captureStackTrace(this, this.constructor);
    }

    create(message, status_code, status_text) {

        this.message = message;
        this.status_code = status_code;
        this.status_text = status_text;

        return this;
    }

}

module.exports = AppError;