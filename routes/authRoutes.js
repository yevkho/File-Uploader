const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const db = require("../prisma/queries");
const passport = require("passport");

const authRouter = Router();

// file
const fs = require("fs");

// Routes

// 1) get sign up form (get)
authRouter.get("/signup", (req, res) => {
  res.render("signUpForm");
});

// 2) execute sign up (post)
const validateSignUp = [
  body("confirmpassword")
    .trim()
    .notEmpty()
    .withMessage("Confirm password should not be empty.")
    .custom((value, { req }) => {
      return value === req.body.password;
    })
    .withMessage("passwords must match."),
];

authRouter.post("/signup", validateSignUp, async (req, res) => {
  // data validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("signUpForm", {
      errors: errors.array(),
    });
  }
  // if successfully validated route
  console.log(req.body);
  const { username, email, password } = req.body;
  // async hashing of password
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
  // add new user to users database
  await db.addUser(username, email, hashedPassword);
  // redirect upon success
  res.redirect("/");
});

// 3) get login form (get)
authRouter.get("/login", (req, res) => {
  res.render("logInForm");
});

// 4) execute login (post)
authRouter.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

// 5) log out
authRouter.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = authRouter;
