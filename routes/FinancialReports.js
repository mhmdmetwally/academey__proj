const express =
    require('express');

const router =
    express.Router();

const financial_report_controller =
    require('../controllers/FinancialReport');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Financial Report
// =====================================================

router.route('/report')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        financial_report_controller
            .getFinancialReport

    );


module.exports =
    router;