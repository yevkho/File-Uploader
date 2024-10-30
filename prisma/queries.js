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

  console.log(user);
}

// 2) find user by name
async function findUserByName(username) {
  const user = await prisma.user.findUnique({
    where: {
      userName: username,
    },
  });

  console.log(user);
  return user;
}

// 3) find user by id
async function findUserById(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  console.log(user);
  return user;
}

// 4) add folder
async function addFolder(folderName, folderPath) {
  const folder = await prisma.folder.create({
    data: {
      name: folderName,
      path: folderPath,
    },
  });

  console.log(folder);
}

// 5) get all folder

async function getAllFolders() {
  const folders = await prisma.folder.findMany();
  return folders;
}

module.exports = {
  addUser,
  findUserByName,
  findUserById,
  addFolder,
  getAllFolders,
};
