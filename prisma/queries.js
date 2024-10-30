const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// 1) add new user
async function addUser(username, email, hashedPassword) {
  const user = await prisma.user.create({
    data: {
      email: email,
      userName: username,
      password: hashedPassword,
    },
  });
}

// 2) find user by name
async function findUserByName(username) {
  const user = await prisma.user.findUnique({
    where: {
      userName: username,
    },
  });

  return user;
}

// 3) find user by id
async function findUserById(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  return user;
}

// 4) add folder
async function addFolder(folderName, folderPath, userId) {
  const folder = await prisma.folder.create({
    data: {
      name: folderName,
      path: folderPath,
      userId: userId,
    },
  });
}

// 5) get all folder

async function getAllUserFolders(userId) {
  const folders = await prisma.folder.findMany({
    where: { userId: parseInt(userId) },
  });
  return folders;
}

// 6) find folder by id (for multer configuration):
async function findFolderById(folderId) {
  const folder = await prisma.folder.findFirst({
    where: { id: parseInt(folderId) },
  });
  return folder;
}

// 7) add new file metadata to db (call after a successful file upload)
async function addFile(name, path, size, folderId) {
  const file = await prisma.file.create({
    data: {
      name,
      path,
      size,
      folder: { connect: { id: parseInt(folderId) } },
    },
  });
  console.log(file);
}

// 8) get files in folder
async function getFilesByFolder(folderId) {
  const files = await prisma.file.findMany({
    where: { folderId: parseInt(folderId) },
  });
  return files;
}

// 9) find file by id
async function findFileById(fileId) {
  const file = await prisma.file.findUnique({
    where: {
      id: parseInt(fileId),
    },
  });
  return file;
}

module.exports = {
  addUser,
  findUserByName,
  findUserById,
  addFolder,
  getAllUserFolders,
  findFolderById,
  addFile,
  getFilesByFolder,
  findFileById,
};
