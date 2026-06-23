import express from "express";
import {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatusByDoctor,
  getAllAppointments,
} from "../controllers/appointment.controller.js";
import { verifyToken, verifyRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, verifyRole("patient"), createAppointment);
router.get("/my", verifyToken, verifyRole("patient"), getMyAppointments);
router.patch("/:id/reschedule", verifyToken, verifyRole("patient"), rescheduleAppointment);
router.patch("/:id/cancel", verifyToken, verifyRole("patient"), cancelAppointment);

router.get("/doctor", verifyToken, verifyRole("doctor"), getDoctorAppointments);
router.patch("/:id/status", verifyToken, verifyRole("doctor"), updateAppointmentStatusByDoctor);

router.get("/", verifyToken, verifyRole("admin"), getAllAppointments);

export default router;