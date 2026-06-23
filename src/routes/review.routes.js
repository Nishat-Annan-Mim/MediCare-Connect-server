import express from "express";
import {
  getReviewsForDoctor,
  getFeaturedReviews,
  createReview,
  getMyReviews,
  updateMyReview,
  deleteMyReview,
} from "../controllers/review.controller.js";
import { verifyToken, verifyRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/featured", getFeaturedReviews);
router.get("/doctor/:doctorId", getReviewsForDoctor);

router.post("/", verifyToken, verifyRole("patient"), createReview);
router.get("/my", verifyToken, verifyRole("patient"), getMyReviews);
router.patch("/:id", verifyToken, verifyRole("patient"), updateMyReview);
router.delete("/:id", verifyToken, verifyRole("patient"), deleteMyReview);

export default router;