class app_error extends Error{
    constructor(){
        super();
    }
    create(message,status_code,status_text){
        this.message=message;
        this.status_code=status_code;
        this.status_text=status_text;
    }
}
module.exports=app_error;