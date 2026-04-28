const app_error = require("./AppError");

class academyNotFound extends Error{
    constructor(){
        super();
    }
    CreateAcademyError(academy_code){
        let message=`${academy_code} not found academy with this code`
        const err=new app_error();
        err.create(message,404,http_status_text.FAIL);
    }
}
module.exports = academyNotFound