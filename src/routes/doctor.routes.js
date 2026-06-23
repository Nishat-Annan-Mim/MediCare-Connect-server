import express from "express";
import {
  getAllDoctors,
  getDoctorById,
  getMyDoctorProfile,
  createDoctorProfile,
  updateMyDoctorProfile,
  getAllDoctorsForAdmin,
  updateDoctorVerification,
} from "../controllers/doctor.controller.js";
import { verifyToken, verifyRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public — Find Doctors page (search, sort, pagination built in)
router.get("/", getAllDoctors);

// Private (admin) — must come BEFORE "/:id" so "admin" isn't treated as an ID
router.get(
  "/admin/all",
  verifyToken,
  verifyRole("admin"),
  getAllDoctorsForAdmin,
);
router.patch(
  "/:id/verify",
  verifyToken,
  verifyRole("admin"),
  updateDoctorVerification,
);

// Private (doctor) — own profile
router.get("/me", verifyToken, verifyRole("doctor"), getMyDoctorProfile);
router.post("/", verifyToken, createDoctorProfile);
router.patch("/me", verifyToken, verifyRole("doctor"), updateMyDoctorProfile);

// Public — doctor details page (must come AFTER /me and /admin/all)
router.get("/:id", getDoctorById);

export default router;
