const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Supervisor =
    require('../models/Supervisor');

const StudentAssignment =
    require('../models/StudentAssignment');

const Academy =
    require('../models/Academy');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');


// =====================================================
// Get My Academies
// =====================================================

const getMyAcademies = AsyncWrapper(

    async (req, res, next) => {

        const user_id =
            req.user.id;


        // =================================================
        // Get all active supervisor assignments
        // =================================================

        const supervisor_assignments =
            await Supervisor.find({

                user: user_id,

                is_active: true

            }).select('academy_id');


        if (!supervisor_assignments.length) {

            const error =
                new app_error();

            error.create(
                'supervisor assignments not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Extract Academy IDs
        // =================================================

        const academy_ids =
            supervisor_assignments.map(
                item => item.academy_id
            );


        // =================================================
        // Get Academies
        // =================================================

        const academies =
            await Academy.find({

                _id: {
                    $in: academy_ids
                },

                is_active: true

            }).select(
                'academy_name academy_code is_active'
            );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                academies

            }

        });

    }

);


// =====================================================
// Get My Students
// =====================================================

const getMyStudents = AsyncWrapper(

    async (req, res, next) => {

        const user_id =
            req.user.id;


        const supervisor =
            await Supervisor.findOne({

                user:
                    user_id,

                is_active: true

            });


        if (!supervisor) {

            const error =
                new app_error();

            error.create(
                'supervisor assignment not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const students =
            await StudentAssignment
                .find({

                    academy_id:
                        supervisor.academy_id,

                    supervisor:
                        supervisor._id,

                    is_active: true

                })

                .populate(
                    'student'
                )

                .populate(
                    'family',
                    'name phone'
                );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                students

            }

        });

    }

);


// =====================================================
// Get Single Student
// =====================================================

const getSingleStudent =
    AsyncWrapper(

        async (req, res, next) => {

            const user_id =
                req.user.id;

            const assignment_id =
                req.params.student_id;


            const supervisor =
                await Supervisor.findOne({

                    user:
                        user_id,

                    is_active: true

                });


            if (!supervisor) {

                const error =
                    new app_error();

                error.create(
                    'supervisor assignment not found',
                    404,
                    http_status_text.FAIL
                );

                return next(error);
            }


            const student =
                await StudentAssignment
                    .findOne({

                        _id:
                            assignment_id,

                        academy_id:
                            supervisor.academy_id,

                        supervisor:
                            supervisor._id,

                        is_active: true

                    })

                    .populate(
                        'student'
                    )

                    .populate(
                        'family',
                        'name phone'
                    );


            if (!student) {

                const error =
                    new app_error();

                error.create(
                    'student not found or you are not allowed to access this student',
                    404,
                    http_status_text.FAIL
                );

                return next(error);
            }


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    student

                }

            });

        }

    );


module.exports = {

    getMyAcademies,

    getMyStudents,

    getSingleStudent

};