import express from "express";
import {
  createPrescription,
  updatePrescription,
  getPrescriptionByAppointment,
  getDoctorPrescriptions,
  getPatientPrescriptions,
} from "../controllers/prescription.controller.js";
import { verifyToken, verifyRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, verifyRole("doctor"), createPrescription);
router.patch("/:id", verifyToken, verifyRole("doctor"), updatePrescription);
router.get("/doctor", verifyToken, verifyRole("doctor"), getDoctorPrescriptions);

router.get("/patient", verifyToken, verifyRole("patient"), getPatientPrescriptions);

router.get("/appointment/:appointmentId", verifyToken, getPrescriptionByAppointment);

export default router;