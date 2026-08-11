const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Family =
    require('../models/Family');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');


// =====================================================
// Create Family
// Academy Admin / Supervisor
// =====================================================

const createFamily = AsyncWrapper(

    async (req, res, next) => {

        const {
            name,
            phone
        } = req.body;


        // =================================================
        // Validation
        // =================================================

        if (
            !name ||
            !phone
        ) {

            const error =
                new app_error();

            error.create(
                'name and phone are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Check Existing Family
        // Same Name + Same Phone
        // =================================================

        const existing_family =
            await Family.findOne({

                name,
                phone

            });


        if (existing_family) {

            const error =
                new app_error();

            error.create(
                'family with this name and phone already exists',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Create Family
        // =================================================

        const family =
            new Family({

                name,

                phone,

                is_active:
                    true

            });


        await family.save();


        // =================================================
        // Response
        // =================================================

        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                family

            }

        });

    }

);


module.exports = {

    createFamily

};