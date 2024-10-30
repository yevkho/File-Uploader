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
const fs = require("fs");
// const upload = multer({ dest: "./public/uploads/" });

// import routers
const autRoutes = require("./routes/authRoutes");
const { fileLoader } = require("ejs");

// set up express
const app = express();

// middleware
// Set view engine to EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// Body parser middleware
app.use(express.urlencoded({ extended: true }));
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
    cookie: { maxAge: 30 * 60 * 1000 },
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

// ROUTES
// 1) AUTHENTICATION
app.use("/", autRoutes);

// 2) FILES
// save file to local memory first (TBD)
const storage = multer.memoryStorage();
const upload = multer({ storage });
// save to local folder (TBD)
app.post("/file", upload.single("file"), async (req, res) => {
  const { originalname, buffer, size } = req.file;
  const { folderId } = req.body;
  console.log({ originalname, buffer, size, folderId });

  const folder = await db.findFolderById(folderId);
  const folderPath = path.join(__dirname, folder.path);

  // Ensure the folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Save the file to the folder (pull it from local memory first)
  const filePath = path.join(folderPath, originalname);
  fs.writeFileSync(filePath, buffer);

  // Save file details to the database
  await db.addFile(originalname, filePath, size, folderId);

  res.redirect("/");
});

// view file details
app.get("/files/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const file = await db.findFileById(fileId);

  res.render("file.ejs", { file });
});

// download file
app.get("/files/:fileId/download", async (req, res) => {
  const { fileId } = req.params;
  const file = await db.findFileById(fileId);

  res.download(file.path);
});

// 3) FOLDERS
// get folder form
app.get("/folders/new", (req, res) => {
  res.render("newFolderForm.ejs");
});
// create folder (post)
app.post("/folders/new", async (req, res) => {
  const userId = req.user.id;
  const folderName = req.body.folder;
  const folderPath = "./folders/" + folderName;
  // add new user to users database
  await db.addFolder(folderName, folderPath, userId);
  // redirect upon success
  res.redirect("/");
});
// view folder (and its files)
app.get("/folders/:folderId", async (req, res) => {
  const { folderId } = req.params;
  console.log(folderId);

  const folder = await db.findFolderById(folderId);
  const files = await db.getFilesByFolder(folderId);

  res.render("folder.ejs", { folder, files });
});

// 4) INDEX
app.get("/", async (req, res) => {
  let folders = [];
  if (req.user) {
    const userId = req.user.id;
    folders = await db.getAllUserFolders(userId);
  }

  // const folders = await db.getAllUserFolders(userId);
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
