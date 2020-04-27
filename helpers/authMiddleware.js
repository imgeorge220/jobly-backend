const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

function authenticateJWT(req, res, next) {
  try {
    const tokenFromBody = req.body._token || req.query._token;
    const payload = jwt.verify(tokenFromBody, SECRET_KEY);

    req.user = payload;
    return next();
  }
  catch (err) {
    return next();
  }
}

function ensureLoggedIn(req, res, next) {
  if (!req.user) {
    return next({ status: 401, message: "Unauthorized" });
  } else {
    return next();
  }
}

function ensureCorrectUser(req, res, next) {
  if (req.user && req.user.username === req.params.username) {
    return next();
  } else {
    return next({ status: 401, message: "Unauthorized" });
  }
}

function checkIfAdmin(req, res, next) {
  if (req.user && req.user.is_admin) {
    return next();
  } else {
    return next({status:401, message: "Unauthorized"});
  }
}

module.exports = { authenticateJWT, ensureCorrectUser, ensureLoggedIn, checkIfAdmin };