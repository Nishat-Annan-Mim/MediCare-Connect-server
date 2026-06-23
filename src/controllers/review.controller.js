import Review from "../models/review.model.js";
import Doctor from "../models/doctor.model.js";
import Appointment from "../models/appointment.model.js";
import User from "../models/user.model.js";

const recalculateDoctorRating = async (doctorId) => {
  const reviews = await Review.find({ doctorId });
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews === 0
      ? 0
      : reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

  await Doctor.findByIdAndUpdate(doctorId, {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
  });
};

/**
 * @desc    Get all public reviews for a specific doctor
 * @route   GET /api/reviews/doctor/:doctorId
 * @access  Public
 */
export const getReviewsForDoctor = async (req, res, next) => {
  try {
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .populate("patientId", "name photo")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get latest reviews across all doctors (for homepage "Patient Success Stories")
 * @route   GET /api/reviews/featured
 * @access  Public
 */
export const getFeaturedReviews = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;

    const reviews = await Review.find({ rating: { $gte: 4 } })
      .populate("patientId", "name photo")
      .populate("doctorId", "doctorName specialization")
      .sort({ createdAt: -1 })
      .limit(limit);

    res
      .status(200)
      .json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a review — only allowed if the patient has a completed appointment with this doctor
 * @route   POST /api/reviews
 * @access  Private (patient)
 */
export const createReview = async (req, res, next) => {
  try {
    const patient = await User.findOne({ email: req.user.email });
    const { doctorId, rating, reviewText } = req.body;

    if (!doctorId || !rating || !reviewText) {
      return res
        .status(400)
        .json({
          success: false,
          message: "doctorId, rating, and reviewText are required.",
        });
    }

    const hasCompletedAppointment = await Appointment.findOne({
      patientId: patient._id,
      doctorId,
      appointmentStatus: "completed",
    });

    if (!hasCompletedAppointment) {
      return res.status(403).json({
        success: false,
        message: "You can only review doctors after a completed appointment.",
      });
    }

    const existingReview = await Review.findOne({
      patientId: patient._id,
      doctorId,
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message:
          "You already reviewed this doctor. You can update your existing review instead.",
      });
    }

    const review = await Review.create({
      patientId: patient._id,
      doctorId,
      rating,
      reviewText,
    });

    await recalculateDoctorRating(doctorId);

    res
      .status(201)
      .json({ success: true, data: review, message: "Review submitted." });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in patient's own reviews
 * @route   GET /api/reviews/my
 * @access  Private (patient)
 */
export const getMyReviews = async (req, res, next) => {
  try {
    const patient = await User.findOne({ email: req.user.email });

    const reviews = await Review.find({ patientId: patient._id })
      .populate("doctorId", "doctorName specialization profileImage")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update the logged-in patient's own review
 * @route   PATCH /api/reviews/:id
 * @access  Private (patient, must own the review)
 */
export const updateMyReview = async (req, res, next) => {
  try {
    const patient = await User.findOne({ email: req.user.email });
    const { rating, reviewText } = req.body;

    const review = await Review.findOne({
      _id: req.params.id,
      patientId: patient._id,
    });
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found." });
    }

    if (rating !== undefined) review.rating = rating;
    if (reviewText !== undefined) review.reviewText = reviewText;
    await review.save();

    await recalculateDoctorRating(review.doctorId);

    res
      .status(200)
      .json({ success: true, data: review, message: "Review updated." });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete the logged-in patient's own review
 * @route   DELETE /api/reviews/:id
 * @access  Private (patient, must own the review)
 */
export const deleteMyReview = async (req, res, next) => {
  try {
    const patient = await User.findOne({ email: req.user.email });

    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      patientId: patient._id,
    });
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found." });
    }

    await recalculateDoctorRating(review.doctorId);

    res.status(200).json({ success: true, message: "Review deleted." });
  } catch (error) {
    next(error);
  }
};
