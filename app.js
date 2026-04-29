const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http_status_text = require('./utils/HttpStatusText');
const admin_routes = require('./routes/Admin');

const app = express();
const url = process.env.MONGO_URL;

app.use(cors());
app.use(express.json());

mongoose.connect(url)
    .then(() => console.log('db start'))
    .catch((err) => console.error(err));

app.get("/", (req, res) => {
    res.json({ msg: "API running" });
});

app.use('/admin', admin_routes);

app.use((req, res) => {
    res.status(404).json({
        status: "FAIL",
        msg: "Not found"
    });
});

app.use((err, req, res, next) => {
    res.status(err.status_code || 500).json({
        status: err.status_text || http_status_text.ERROR || "ERROR",
        msg: err.message,
        code: err.status_code || 500
    });
});

module.exports = app;