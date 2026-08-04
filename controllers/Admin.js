const mongoose = require('mongoose');

const app_error = require('../utils/AppError');
const academy_notfound_error = require('../utils/AcademyNotFoundError');

const http_status_text = require('../utils/HttpStatusText');

const async_wrapper = require('../middleware/AsyncWrapper');

const Academy = require('../models/Academy');
const Student = require('../models/Student');


// =========================
// Find Academy
// =========================

async function Find_Academy(academy_id) {

    return await Academy.findOne({
        academy_id
    });

}


// =========================
// Show All Academies
// =========================

const getShowAllAcademey = async_wrapper(
    async (req, res, next) => {

        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            Number(req.query.limit) || 3,
            100
        );

        const skip = (page - 1) * limit;

        const academies = await Academy
            .find({})
            .select('-__v')
            .limit(limit)
            .skip(skip)
            .sort({
                createdAt: -1
            });

        const total = await Academy.countDocuments();

        return res.json({

            status: http_status_text.SUCCESS,

            data: {
                academies,

                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }

        });

    }
);


// =========================
// Get Single Academy
// =========================

const getSingleAcademy = async_wrapper(
    async (req, res, next) => {

        const academy_id = req.params.academy_id;

        const academy = await Find_Academy(
            academy_id
        );

        if (!academy) {

            const err = new academy_notfound_error();

            return next(
                err.CreateAcademyError(academy_id)
            );
        }

        return res.json({

            status: http_status_text.SUCCESS,

            data: {
                academy
            }

        });

    }
);


// =========================
// Count Students
// =========================

const getCountStudentsAcademy = async_wrapper(
    async (req, res, next) => {

        const academy_id = req.params.academy_id;

        const academy = await Find_Academy(
            academy_id
        );

        if (!academy) {

            const err = new academy_notfound_error();

            return next(
                err.CreateAcademyError(academy_id)
            );
        }

        const studentCount = await Student.countDocuments({
            academy: academy._id
        });

        return res.status(200).json({

            status: http_status_text.SUCCESS,

            data: {
                academy_name: academy.academy_name,

                student_count: studentCount
            }

        });

    }
);


// =========================
// Stop Academy
// =========================

const patchStopAcademy = async_wrapper(
    async (req, res, next) => {

        const academy_id = req.params.academy_id;

        const academy = await Find_Academy(
            academy_id
        );

        if (!academy) {

            const err = new academy_notfound_error();

            return next(
                err.CreateAcademyError(academy_id)
            );
        }

        const updated_academy =
            await Academy.findOneAndUpdate(

                {
                    academy_id
                },

                {
                    is_active: false
                },

                {
                    new: true,
                    runValidators: true
                }

            );

        return res.status(200).json({

            status: http_status_text.SUCCESS,

            data: {
                academy: updated_academy
            }

        });

    }
);


// =========================
// Activate Academy
// =========================

const patchActiveAcademy = async_wrapper(
    async (req, res, next) => {

        const academy_id = req.params.academy_id;

        const {
            subscription_period
        } = req.body;

        const academy = await Find_Academy(
            academy_id
        );

        if (!academy) {

            const err = new academy_notfound_error();

            return next(
                err.CreateAcademyError(academy_id)
            );
        }

        const updated_academy =
            await Academy.findOneAndUpdate(

                {
                    academy_id
                },

                {
                    is_active: true,

                    ...(subscription_period && {
                        subscription_period
                    })
                },

                {
                    new: true,
                    runValidators: true
                }

            );

        return res.status(200).json({

            status: http_status_text.SUCCESS,

            data: {
                academy: updated_academy
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