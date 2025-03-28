const admin = require("firebase-admin");
const { admin, db } = require("../config/firebase");

const createUser = async (userData) => {
  const userRecord = await admin.auth().createUser(userData);
  return userRecord;
};

const getUser = async (uid) => {
  const userRecord = await admin.auth().getUser(uid);
  return userRecord;
};

const updateUser = async (uid, userData) => {
  const userRecord = await admin.auth().updateUser(uid, userData);
  return userRecord;
};

const deleteUser = async (uid) => {
  await admin.auth().deleteUser(uid);
};

const getAllUsers = async () => {
  const listUsersResult = await admin.auth().listUsers();
  return listUsersResult.users;
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getAllUsers,
  db,
};
