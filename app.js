
const express=require('express');
const url=process.env.MONGO_URL;
const mongoose=require('mongoose');
const http_status_text=require('./utils/HttpStatusText');
const admin_routes=require('./routes/Admin');
mongoose.connect(url).then(()=>{
    console.log('mongodb srvr start');
})

const app=express();

app.use('/admin',admin_routes)

app.use((req,res)=>{
    res.status(404).json({
        status:"FAIL",
        message:"Rout not found"
    });
})
app.use((err,req,res,next)=>{
    res.status(err.status_code||500).json({
        status:err.status_text||http_status_text.ERORR,
        message:err.message,
        code:err.status_code||500
    });
})