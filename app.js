const express = require("express");
const path = require("path");

const session = require("express-session");
const { PrismaClient } = require("@prisma/client");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

const passport = require("passport");
require("./config/passportConfig");

const db = require("./prisma/queries");

// multer (uploads)
const multer = require("multer");
// const upload = multer({ dest: "./public/uploads/" });

// import routers
const autRoutes = require("./routes/authRoutes");

// set up express
const app = express();

// middleware
// Set view engine to EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// Body parser middleware
app.use(express.urlencoded({ extended: false }));
// Session middleware
app.use(
  session({
    store: new PrismaSessionStore(new PrismaClient(), {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
    secret: "snow cats",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 10 * 60 * 1000 },
  })
);
app.use(passport.session());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});
// Serve static files (CSS, images, etc.)
app.use(express.static("public"));

// routers

// AUTH
// 1 authentication route
app.use("/", autRoutes);

// FILES
// 2 file upload route
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.post("/file", upload.single("file"), (req, res) => {
  console.log(req.file);
  res.redirect("/");
});

// FOLDERS
// 3.1 folder form get
app.get("/folders/new", (req, res) => {
  res.render("newFolderForm.ejs");
});
// 3.2 folder form post
app.post("/folders/new", async (req, res) => {
  const folderName = req.body.folder;
  const folderPath = "./folders/" + folderName;
  // add new user to users database
  await db.addFolder(folderName, folderPath);
  // redirect upon success
  res.redirect("/");
});

// INDEX
// 4 index route
app.get("/", async (req, res) => {
  const folders = await db.getAllFolders();
  console.log(folders);

  res.render("index.ejs", { folders });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).send(err.message);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
