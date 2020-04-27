/** Express app for jobly. */

const express = require("express");
const ExpressError = require("./helpers/expressError");
const morgan = require("morgan");
const app = express();
const cors = require("cors");
app.use(cors());
const { authenticateJWT } = require("./helpers/authMiddleware")

const companyRoutes = require('./routes/companies');
const jobRoutes = require('./routes/jobs');
const userRoutes = require('./routes/users');


app.use(express.json());
app.use(authenticateJWT);

// add logging system
app.use(morgan("tiny"));

app.use("/companies", companyRoutes);
app.use("/jobs", jobRoutes);
app.use("/users", userRoutes);

/** 404 handler */

app.use(function (req, res, next) {
  const err = new ExpressError("Not Found", 404);

  // pass the error to the next piece of middleware
  return next(err);
});

/** general error handler */

app.use(function (err, req, res, next) {
  res.status(err.status || 500);

  return res.json({
    status: err.status,
    message: err.message
  });
});

module.exports = app;
