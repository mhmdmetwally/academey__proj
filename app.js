
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const http_status_text =
    require('./utils/HttpStatusText');

const admin_routes =
    require('./routes/Admin');

const academy_routes =
    require('./routes/Academy');

const user_routes =
    require('./routes/User');

const teacher_routes =
    require('./routes/Teacher');

const student_routes =
    require('./routes/Student');

const supervisor_routes =
    require('./routes/Supervisor');

const family_routes =
    require('./routes/Family');

const student_subject_routes =
    require('./routes/StudentSubject');

const lesson_routes =
    require('./routes/Lesson');

const invoice_routes =
    require('./routes/Invoice');

const payment_routes =
    require('./routes/Payment');

const expense_routes =
    require('./routes/Expense');

const financial_report_routes =
    require('./routes/FinancialReport');

const app = express();

const url =
    process.env.MONGO_URL;


// =====================================================
// Middleware
// =====================================================

app.use(cors());

app.use(express.json());


// =====================================================
// MongoDB
// =====================================================

console.log(
    "MONGO =",
    process.env.MONGO_URL
);


mongoose.connect(url)

    .then(() =>
        console.log('db start')
    )

    .catch((err) =>
        console.error(err)
    );


mongoose.set(
    'debug',
    true
);


// =====================================================
// Home
// =====================================================

app.get("/", (req, res) => {

    res.json({
        msg: "API running"
    });

});


// =====================================================
// Test
// =====================================================

app.get('/test', (req, res) => {

    console.log(
        "test route works"
    );

    res.json({

        mongo:
            process.env.MONGO_URL

    });

});


// =====================================================
// Routes
// =====================================================

app.use(
    '/academy',
    academy_routes
);

app.use(
    '/admin',
    admin_routes
);

app.use(
    '/user',
    user_routes
);

app.use(
    '/teacher',
    teacher_routes
);

app.use(
    '/student',
     student_routes
);

app.use(
    '/supervisor',
     supervisor_routes
);

app.use(
    '/family',
     family_routes
);

app.use(
    '/student-subject',
    student_subject_routes
);

app.use(
    '/lesson',
    lesson_routes
);

app.use(
    '/invoice',
    invoice_routes
);

app.use(
    '/payment',
    payment_routes
);

app.use(
    '/expense',
    expense_routes
);

app.use(
    '/financial',
    financial_report_routes
);

// =====================================================
// 404
// =====================================================

app.use((req, res) => {

    res.status(404).json({

        status:
            http_status_text.FAIL,

        msg:
            "Not found"

    });

});


// =====================================================
// Error Handler
// =====================================================

app.use((err, req, res, next) => {

    res.status(
        err.status_code || 500
    ).json({

        status:
            err.status_text ||
            http_status_text.ERROR,

        msg:
            err.message,

        code:
            err.status_code || 500

    });

});


module.exports = app;

