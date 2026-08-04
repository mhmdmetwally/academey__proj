const app_error = require('./AppError');
const http_status_text = require('./HttpStatusText');

class AcademyNotFound extends Error {

    constructor() {
        super();
    }

    CreateAcademyError(academy_id) {

        return new app_error().create(
            `${academy_id} not found academy with this code`,
            404,
            http_status_text.FAIL
        );

    }

}

module.exports = AcademyNotFound;