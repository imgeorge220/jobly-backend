const express = require("express");
const jsonschema = require("jsonschema");

const router = new express.Router();

const ExpressError = require("../helpers/expressError");
const Job = require("../models/job");
const { ensureLoggedIn, checkIfAdmin } = require("../helpers/authMiddleware");

const postSchema = require("../schemas/jobPostSchema.json");
const patchSchema = require("../schemas/jobPatchSchema.json");
const applicationSchema = require("../schemas/applicationSchema.json");

router.get("/", ensureLoggedIn, async (req, res, next) => {
  try {
    let result = await Job.allByQueries(req.query, req.user.username);
    return res.json(result);
  }
  catch (err) {
    return next(err);
  }
});

router.get("/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    let job = await Job.getByID(req.params.id);
    return res.json(job);
  }
  catch (err) {
    return next(err);
  }
});

router.post("/", checkIfAdmin, async (req, res, next) => {
  try {
    const validData = jsonschema.validate(req.body, postSchema);

    if (!validData.valid) {
      let listOfErrors = validData.errors.map(error => error.stack);
      throw new ExpressError(listOfErrors, 400);
    }

    let job = new Job(req.body);
    await job.addToDb();

    return res.status(201).json({ job });
  }
  catch (err) {
    return next(err);
  }
});

router.post("/:id/apply", ensureLoggedIn, async (req, res, next) => {
  try {
    const validData = jsonschema.validate(req.body, applicationSchema);

    if (!validData.valid) {
      let listOfErrors = validData.errors.map(error => error.stack);
      throw new ExpressError(listOfErrors, 400);
    }

    await Job.getByID(req.params.id);
    let state = await Job.apply(req.user.username, req.params.id, req.body.state);

    return res.status(201).json({ message: state });
  }
  catch(err) {
    return next(err);
  }

})

router.patch("/:id", checkIfAdmin, async (req, res, next) => {
  try {
    const validData = jsonschema.validate(req.body, patchSchema);

    if (!validData.valid) {
      let listOfErrors = validData.errors.map(error => error.stack);
      throw new ExpressError(listOfErrors, 400);
    }
    let result = await Job.update(req.params.id, req.body);
    return res.json(result);
  }
  catch (err) {
    return next(err);
  }
});

router.delete("/:id", checkIfAdmin, async (req, res, next) => {
  try {
    let result = await Job.deleteFromDb(req.params.id);
    return res.json(result);
  }
  catch (err) {
    return next(err);
  }
})



module.exports = router;