const express = require("express");
const path = require("path");

const session = require("express-session");
const { PrismaClient } = require("@prisma/client");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

const passport = require("passport");
require("./config/passportConfig");
const { checkAuthentication, checkFolderAccess } = require("./config/authMlw");

const db = require("./prisma/queries");

const { v4: uuidv4 } = require("uuid");

// multer (uploads)
const multer = require("multer");
const fs = require("fs");
// const upload = multer({ dest: "./public/uploads/" });

// cloud - supabase
const supabase = require("./config/supabaseConfig");

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
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file upload limit
});
// save to local folder (TBD)
app.post(
  "/file",
  checkAuthentication,
  upload.single("file"),
  async (req, res) => {
    const { originalname, buffer, size } = req.file;
    const { folderId } = req.body;
    const userId = req.user.id;
    // console.log({ originalname, buffer, size, folderId, userId });

    // Find the folder to get its name (optional)
    const folder = await db.findFolderById(folderId);
    // const folderPath = path.join(__dirname, folder.path);

    // Save the file to the local folder (pull it from local memory first) (optional)
    // Ensure the folder exists
    // if (!fs.existsSync(folderPath)) {
    //   fs.mkdirSync(folderPath, { recursive: true });
    // }
    // const filePath = path.join(folderPath, originalname);
    // fs.writeFileSync(filePath, buffer);

    // define path to save to cloud (supabase)
    const supabaseFilePath = `${folder.name}/${originalname}`;

    // Upload the file buffer to Supabase Storage
    const { data, error } = await supabase.storage
      .from("top_uploads")
      .upload(supabaseFilePath, buffer);
    if (error) {
      console.error("Error uploading to Supabase:", error);
      return res.status(500).send("Error uploading file");
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData, error: urlError } = supabase.storage
      .from("top_uploads")
      .getPublicUrl(supabaseFilePath);
    if (urlError) {
      console.error("Error getting public URL:", urlError);
      return res.status(500).send("Error getting file URL");
    }
    const publicURL = publicUrlData.publicUrl;
    console.log(publicURL);

    // Save file to the database (and its details) (optional)
    // await db.addFile(originalname, filePath, size, folderId, buffer, publicURL);
    await db.addFile(originalname, size, folderId, buffer, publicURL);

    res.redirect("/");
  }
);

// view file details
app.get("/files/:fileId", checkAuthentication, async (req, res) => {
  const { fileId } = req.params;
  const file = await db.findFileById(fileId);

  res.render("file.ejs", { file });
});

// download file
app.get("/files/:fileId/download", checkAuthentication, async (req, res) => {
  const { fileId } = req.params;
  const file = await db.findFileById(fileId);
  console.log(file);

  if (!file || !file.url) {
    return res.status(404).send("File not found");
  }
  // 1 send from local file system
  // res.download(file.path);

  // 2 send from DB
  // res.set({
  //   "Content-Type": "application/octet-stream",
  //   "Content-Disposition": `attachment; filename="${file.name}"`,
  // });
  // res.send(file.content);

  // 3 sent from cloud(supabase)
  res.redirect(file.url);
});

// 3) FOLDERS
// get folder form
app.get("/folders/new", checkAuthentication, (req, res) => {
  res.render("newFolderForm.ejs");
});
// create folder (post)
app.post("/folders/new", checkAuthentication, async (req, res) => {
  const userId = req.user.id;
  const folderName = req.body.folder;
  const folderPath = "./folders/" + folderName;
  // add new user to users database
  await db.addFolder(folderName, folderPath, userId);
  // redirect upon success
  res.redirect("/");
});
// view folder (and its files)
app.get(
  "/folders/:folderId",
  checkAuthentication,
  checkFolderAccess,
  async (req, res) => {
    const { folderId } = req.params;
    console.log(folderId);

    const folder = await db.findFolderById(folderId);
    const files = await db.getFilesByFolder(folderId);

    // Fetch existing share links for this folder
    const sharedFolders = await db.getSharedLinksByFolderId(folderId);

    res.render("folder.ejs", { folder, files, sharedFolders });
  }
);

// share folder (post)
app.post(
  "/folders/:folderId/share",
  checkAuthentication,
  checkFolderAccess,
  async (req, res) => {
    const { folderId } = req.params;
    const { duration } = req.body;
    const shareDuration = parseInt(duration);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + shareDuration);

    // Generate a UUID for the share link
    const uuid = uuidv4();

    // Save the share link to the database
    await db.createSharedFolder(uuid, folderId, expiresAt);

    // Redirect back to the folder page
    res.redirect(`/folders/${folderId}`);
  }
);

// access shared folder (get)
app.get("/share/:uuid", async (req, res) => {
  const { uuid } = req.params;

  // Fetch the shared folder using the UUID
  const sharedFolder = await db.getSharedFolderByUUID(uuid);

  if (!sharedFolder) {
    return res.status(404).send("Shared link not found.");
  }

  // Check if the link has expired
  const currentTime = new Date();
  if (currentTime > sharedFolder.expiresAt) {
    return res.status(410).send("This shared link has expired.");
    // also delete from the database-table if expired
  }

  // Fetch the files in the folder
  const files = await db.getFilesByFolder(sharedFolder.folderId);

  // Render a view to display the folder and its files
  res.render("sharedFolder.ejs", {
    folder: sharedFolder.folder,
    files,
    sharedFolderUUID: uuid,
  });
});

// download file from shared link
app.get("/files/:fileId/download_shared", async (req, res) => {
  const { fileId } = req.params;
  const { uuid } = req.query;

  // Fetch the shared folder using the UUID
  const sharedFolder = await db.getSharedFolderByUUID(uuid);

  if (!sharedFolder) {
    return res.status(404).send("Shared link not found.");
  }

  // Check if the link has expired
  const currentTime = new Date();
  if (currentTime > sharedFolder.expiresAt) {
    return res.status(410).send("This shared link has expired.");
  }

  // Fetch the file and ensure it belongs to the shared folder
  const file = await db.findFileById(fileId);

  if (!file || file.folderId !== sharedFolder.folderId) {
    return res.status(403).send("You are not authorized to access this file.");
  }

  // Redirect to the file URL (assuming public access)
  res.redirect(file.url);
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
