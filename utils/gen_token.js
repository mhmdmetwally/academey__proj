const JWT_SECRET=process.env.JWT_SECRET;
const jwt = require('jsonwebtoken');
module.exports = async(payload)=>{

    const token = await jwt.sign({
        payload
        },
        JWT_SECRET,
        {expiresIn:'2w'}
    );
    return token;
}