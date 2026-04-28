const mongoose=require('mongoose');
const validator=require('validator');
const StudentSchema = new mongoose.Schema({
    academycode:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Academy'
    }
});
