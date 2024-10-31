const db = require("../prisma/queries");

const checkAuthentication = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res
      .status(401)
      .json({ msg: "You are not authorized to view this resource" });
  }
};

const checkFolderAccess = async (req, res, next) => {
  const { folderId } = req.params;
  const userId = req.user.id;

  // Fetch the folder by its ID
  const folder = await db.findFolderById(folderId);

  if (folder && folder.userId === userId) {
    return next();
  } else {
    res
      .status(403)
      .json({ msg: "You are not authorized to access this folder" });
  }
};

module.exports = { checkAuthentication, checkFolderAccess };
