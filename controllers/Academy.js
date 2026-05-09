const AsyncWrapper = require('../middleware/AsyncWrapper');
const User = require('../models/User');




const patchActiveSupervisor = AsyncWrapper(
    async(req,res,next)=>{
        const {phone,name}=req.body;
        const user = await User.findOne({phone});
        if(!user){
            
        }
    }
)