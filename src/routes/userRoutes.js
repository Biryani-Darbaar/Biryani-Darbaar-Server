const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/", userController.createUser);
router.get("/:id", userController.getUser);
router.put("/:id", userController.updateUser);
router.put("/:id/points", userController.updateUserPoints);
router.delete("/:id", userController.deleteUser);

module.exports = router;
