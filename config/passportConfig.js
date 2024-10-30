const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const db = require("../prisma/queries");

// 1) the basic Authentication callback (basic mlw with redirects based on result, but just wrapped tailored function)
const verifyCallback = async (username, password, done) => {
  try {
    // 1 - get user from db
    const user = await db.findUserByName(username);
    // 2 - if no user found in db return 401 (unauthorized)
    if (!user) {
      console.log("Incorrect username");
      return done(null, false, { message: "Incorrect username" });
    }
    // 3 - if user exists check the password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // 4 - if no passwords match return 401 (unauthorized)
      console.log("Incorrect password");
      return done(null, false, { message: "Incorrect password" });
    }
    // 5 - if user & password successfully authenticated then pass user to route
    console.log("successful authentication");
    return done(null, user);
  } catch (err) {
    // if any errors along the way (e.g., db issues)
    console.log("un-successful authentication");
    return done(err);
  }
};

// 2) create new local authentication strategy
const strategy = new LocalStrategy(verifyCallback);

// 3) connect strategy to the passport framework
passport.use(strategy);

// 4.1) serialize the user to the session (add user id to session object)
passport.serializeUser((user, done) => {
  console.log("serializing");
  done(null, user.id);
});

// 4.2) deserialize the user from the session (pull user id and then the entire user and add to req.user)
passport.deserializeUser(async (userId, done) => {
  console.log("de-serializing");
  try {
    const user = await db.findUserById(userId);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
