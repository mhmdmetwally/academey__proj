const mongoose=require('mongoose');
const validator=require('validator');
const { student } = require('../utils/UserRole');
const StudentSchema = new mongoose.Schema({
    academycode:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Academy'
    }
});

module.exports=mongoose.model('Student',StudentSchema);