const app_error=require('../utils/AppError');
const academy_notfound_error=require('../utils/AcademyNotFoundError')
const http_status_text=require('../utils/HttpStatusText');
const async_wrapper=require('../middleware/AsyncWrapper');
const Academy = require('../models/Academy');
const Student =require('../models/Student');

async function Find_Academy(id){
    return await Academy.findOne({ academy_code: id });
}

const getShowAllAcademey=async_wrapper(
    async(req,res,next)=>{
        const query = req.query;
        const limit = query.limit || 3;
        const page = query.page || 1 ;
        const skip = (page - 1) * limit;
        const academes = await Academy.find({},{"__v":false}).
                            limit(limit).skip(skip);
        res.json({
            status : http_status_text.SUCCESS,
            data:{academes}
        });
    }
)

const getSingleAcademy = async_wrapper(
  async (req, res,next) => {

    const academy_id = req.params.academy_id;

    const academy = await Find_Academy(academy_id)

    if (academy) {
       res.json({status:http_status_text.SUCCESS,data:{course}});
    } else {
        const err=new academy_notfound_error();
        err.CreateAcademyError(academy_id);
        return next(err);  
    }

  }
)

const getCountStudentsAcademy = async_wrapper(async (req, res, next) => {

    const academy_id = req.params.academy_id;

    const academy = await Find_Academy(academy_id)

    if (!academy)  {
        const err=new academy_notfound_error();
        err.CreateAcademyError(academy_id);
        return next(err);  
    }

    const result = await Student.aggregate([
       { $match: { academy_id: mongoose.Types.ObjectId(academy_code) } },
        { $group: { _id: "$academy_id", count: { $sum: 1 } } }
    ]);

    const studentCount = result.length > 0 ? result[0].count : 0;

    res.status(200).json({
        status: http_status_text.SUCCESS,
        data: { 
            academy_name: academy.academy_name,
            student_count: studentCount 
        }
    });
});

const patchStopAcademy=async_wrapper(
    async(req,res,next)=>{
        const academy_id = req.params.academy_id;

        const academy = await Find_Academy(academy_id)

        if (academy) {
            const academy = Academy.updateOne(
                academy_code,
                {is_active:false},
                {new:true}
            )
        }
        else {
            const err=new academy_notfound_error();
            err.CreateAcademyError(academy_id);
            return next(err);  
        }
    }
)
const patchActiveAcademy=async_wrapper(
    async(req,res,next)=>{
        const {academy_id, subscription_period} = req.params;

        const academy = await Find_Academy(academy_id)

        if (academy) {
            const academy = Academy.updateOne(
                academy_code,
                {
                    is_active:true,
                    subscription_period:subscription_period
                },
                {new:true,runValidators:true}
            )
        }
        else {
            const err=new academy_notfound_error();
            err.CreateAcademyError(academy_id);
            return next(err);  
        }
    }
)


module.exports={
    getCountStudentsAcademy,
    getShowAllAcademey,
    getSingleAcademy,
    patchActiveAcademy,
    patchStopAcademy
}