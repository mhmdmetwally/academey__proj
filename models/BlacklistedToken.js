const mongoose = require('mongoose');

const BlacklistedTokenSchema =
    new mongoose.Schema(

        {
            token_hash: {
                type: String,
                required: true,
                unique: true,
                index: true
            },

            expires_at: {
                type: Date,
                required: true,
                index: true
            }
        },

        {
            timestamps: true
        }

    );


// Automatically delete the token from MongoDB
// after the JWT expiration date
BlacklistedTokenSchema.index(
    { expires_at: 1 },
    { expireAfterSeconds: 0 }
);


module.exports =
    mongoose.model(
        'BlacklistedToken',
        BlacklistedTokenSchema
    );