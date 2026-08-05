const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const User =
    require('../models/User');

const StudentAssignment =
    require('../models/StudentAssignment');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');


// =====================================================
// Get My Students
// =====================================================

const getMyStudents = AsyncWrapper(

    async (req, res, next) => {

        const family_id =
            req.user.id;


        const family =
            await User.findOne({

                _id:
                    family_id,

                role:
                    'family'

            });


        if (!family) {

            const error =
                new app_error();

            error.create(
                'family not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const students =
            await StudentAssignment
                .find({

                    family:
                        family_id,

                    is_active: true

                })

                .populate(
                    'student'
                )

                .populate(
                    'academy_id',
                    'academy_name academy_code'
                )

                .populate({
                    path: 'supervisor',
                    populate: {
                        path: 'user',
                        select: 'name phone'
                    }
                });


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

            const family_id =
                req.user.id;

            const assignment_id =
                req.params.student_id;


            const student =
                await StudentAssignment
                    .findOne({

                        _id:
                            assignment_id,

                        family:
                            family_id,

                        is_active: true

                    })

                    .populate(
                        'student'
                    )

                    .populate(
                        'academy_id',
                        'academy_name academy_code'
                    )

                    .populate({
                        path: 'supervisor',
                        populate: {
                            path: 'user',
                            select: 'name phone'
                        }
                    });


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

    getMyStudents,

    getSingleStudent

};