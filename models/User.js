const mongoose=require('mongoose');
const validator=require('validator');
const UserSchema=new  mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        validate:[
            (value)=>validator.isLength(
                value,{min:3,max:40}
                ),
            "40 الاسم على الأقل 3 احرف وعلى الأكثر"
        ]
    },
    email:{
        type:String,
        unique:true,
        sparse:true,
        required:function(){
            return this.role === 'supervisor';
        },
        validate:[validator.isEmail,"برجاء إدخال بريد إلكتروني صحيح"]
    },
    password:{
        type:String,
        required:true,
        validate:{
            validator:function(value){
                return validator.isStrongPassword(value,{
                    minLength:8,
                    minLowercase:1,
                    minUppercase:1,
                    minNumbers:1,
                    minSymbols:1
                });
            },
            message:'كلمة المرور ضعيفة! يجب أن تحتوي على 8 أحرف تشمل (حرف كبير، حرف صغير، رقم، ورمز)'
        }
    },
    role:{
        type:String,
        enum: ['super_admin', 'academy_admin', 'supervisor', 'teacher', 'family'],
        required:true
    },
    academy_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Academy',
        required:function(){
            return this.role !== 'super_admin';
        }
    },
    assigned_students:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Student'
    }]
},{timestamps:true});
module.exports=mongoose.model('User',UserSchema);