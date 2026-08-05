const mongoose =
    require('mongoose');

const app_error =
    require('../utils/AppError');

const academy_notfound_error =
    require('../utils/AcademyNotFoundError');

const http_status_text =
    require('../utils/HttpStatusText');

const async_wrapper =
    require('../middleware/AsyncWrapper');

const Academy =
    require('../models/Academy');

const StudentAssignment =
    require('../models/StudentAssignment');


// =====================================================
// Find Academy
// =====================================================

async function Find_Academy(id) {

    return await Academy.findOne({
        academy_code: id
    });

}


// =====================================================
// Show All Academies
// =====================================================

const getShowAllAcademey =
    async_wrapper(

        async (req, res, next) => {

            const query =
                req.query;

            const limit =
                Number(query.limit) || 3;

            const page =
                Number(query.page) || 1;

            const skip =
                (page - 1) * limit;


            const academes =
                await Academy.find(
                    {},
                    {
                        "__v": false,
                        "password": false
                    }
                )
                .limit(limit)
                .skip(skip);


            return res.json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    academes
                }

            });

        }
    );


// =====================================================
// Get Single Academy
// =====================================================

const getSingleAcademy =
    async_wrapper(

        async (req, res, next) => {

            const academy_id =
                req.params.academy_id;


            const academy =
                await Find_Academy(
                    academy_id
                );


            if (!academy) {

                const err =
                    new academy_notfound_error();

                err.CreateAcademyError(
                    academy_id
                );

                return next(err);
            }


            academy.password =
                undefined;


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    academy
                }

            });

        }
    );


// =====================================================
// Count Students in Academy
// =====================================================

const getCountStudentsAcademy =
    async_wrapper(

        async (req, res, next) => {

            const academy_code =
                req.params.academy_id;


            const academy =
                await Find_Academy(
                    academy_code
                );


            if (!academy) {

                const err =
                    new academy_notfound_error();

                err.CreateAcademyError(
                    academy_code
                );

                return next(err);
            }


            const result =
                await StudentAssignment.aggregate([

                    {
                        $match: {

                            academy_id:
                                academy._id,

                            is_active:
                                true

                        }
                    },

                    {
                        $count:
                            "count"
                    }

                ]);


            const studentCount =
                result.length > 0
                    ? result[0].count
                    : 0;


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    academy_name:
                        academy.academy_name,

                    student_count:
                        studentCount

                }

            });

        }
    );


// =====================================================
// Stop Academy
// =====================================================

const patchStopAcademy =
    async_wrapper(

        async (req, res, next) => {

            const academy_code =
                req.params.academy_id;


            const academy =
                await Find_Academy(
                    academy_code
                );


            if (!academy) {

                const err =
                    new academy_notfound_error();

                err.CreateAcademyError(
                    academy_code
                );

                return next(err);
            }


            academy.is_active =
                false;

            await academy.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    academy
                }

            });

        }
    );


// =====================================================
// Activate Academy
// =====================================================

const patchActiveAcademy =
    async_wrapper(

        async (req, res, next) => {

            const academy_code =
                req.params.academy_id;

            const {
                subscription_period
            } = req.body;


            const academy =
                await Find_Academy(
                    academy_code
                );


            if (!academy) {

                const err =
                    new academy_notfound_error();

                err.CreateAcademyError(
                    academy_code
                );

                return next(err);
            }


            academy.is_active =
                true;


            if (subscription_period) {

                academy.subscription_period =
                    subscription_period;

            }


            await academy.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    academy
                }

            });

        }
    );


module.exports = {

    getCountStudentsAcademy,

    getShowAllAcademey,

    getSingleAcademy,

    patchActiveAcademy,

    patchStopAcademy

};