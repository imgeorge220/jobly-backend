const express = require("express");
const jsonschema = require("jsonschema");

const router = new express.Router();

const ExpressError = require("../helpers/expressError");
const User = require("../models/user");
const { ensureCorrectUser } = require("../helpers/authMiddleware");

const postSchema = require("../schemas/userPostSchema.json");
const patchSchema = require("../schemas/userPatchSchema.json");

router.get("/", async (req, res, next) => {
  try {
    let result = await User.all();
    return res.json(result);
  }
  catch (err) {
    return next(err);
  }
});

router.get("/:username", async (req, res, next) => {
  try {
    let user = await User.getByUsername(req.params.username);
    return res.json(user);
  }
  catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const validData = jsonschema.validate(req.body, postSchema);

    if (!validData.valid) {
      let listOfErrors = validData.errors.map(error => error.stack);
      throw new ExpressError(listOfErrors, 400);
    }
    let user = new User(req.body);
    await user.addToDb();

    let token = user.createToken();

    return res.status(201).json({ _token: token });
  }
  catch (err) {
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    let user = await User.login(req.body);
    let token = user.createToken();

    return res.json({ _token: token });
  }
  catch(err) {
    return next(err);
  }
})

router.patch("/:username", ensureCorrectUser, async (req, res, next) => {
  try {
    const validData = jsonschema.validate(req.body, patchSchema);

    if (!validData.valid) {
      let listOfErrors = validData.errors.map(error => error.stack);
      throw new ExpressError(listOfErrors, 400)
    }
    let result = await User.update(req.params.username, req.body);
    return res.json(result);
  }
  catch (err) {
    return next(err);
  }
});

router.delete("/:username", ensureCorrectUser, async (req, res, next) => {
  try {
    let result = await User.deleteFromDb(req.params.username);
    return res.json(result);
  }
  catch (err) {
    return next(err);
  }
})



module.exports = router;