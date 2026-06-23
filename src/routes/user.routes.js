import express from "express";
import {
  syncUser,
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  deleteUser,
  updateUserStatus,
} from "../controllers/user.controller.js";
import { verifyToken, verifyRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public — called right after Better Auth login/register to sync the user into MongoDB
router.post("/", syncUser);

// Private — logged-in user's own profile
router.get("/me", verifyToken, getMyProfile);
router.patch("/me", verifyToken, updateMyProfile);

// Private (admin only) — user management
router.get("/", verifyToken, verifyRole("admin"), getAllUsers);
router.delete("/:id", verifyToken, verifyRole("admin"), deleteUser);
router.patch("/:id/status", verifyToken, verifyRole("admin"), updateUserStatus);

export default router;
