import express from "express";
import {
  submitContactMessage,
  getAllContactMessages,
} from "../controllers/contact.controller.js";
import { verifyToken, verifyRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", submitContactMessage);
router.get("/", verifyToken, verifyRole("admin"), getAllContactMessages);

export default router;
