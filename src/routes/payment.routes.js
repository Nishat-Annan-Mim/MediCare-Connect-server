import express from "express";
import {
  createCheckoutSession,
  confirmPayment,
  getMyPayments,
  getAllPayments,
} from "../controllers/payment.controller.js";
import { verifyToken, verifyRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create-checkout-session", verifyToken, verifyRole("patient"), createCheckoutSession);
router.post("/confirm", verifyToken, verifyRole("patient"), confirmPayment);
router.get("/my", verifyToken, verifyRole("patient"), getMyPayments);

router.get("/", verifyToken, verifyRole("admin"), getAllPayments);

export default router;