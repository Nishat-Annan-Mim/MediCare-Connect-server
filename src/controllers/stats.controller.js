import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
import Appointment from "../models/appointment.model.js";
import Review from "../models/review.model.js";

export const getPublicStats = async (req, res, next) => {
  try {
    const [totalDoctors, totalPatients, totalAppointments, totalReviews] =
      await Promise.all([
        Doctor.countDocuments({ verificationStatus: "verified" }),
        User.countDocuments({ role: "patient" }),
        Appointment.countDocuments(),
        Review.countDocuments(),
      ]);

    res.status(200).json({
      success: true,
      data: { totalDoctors, totalPatients, totalAppointments, totalReviews },
    });
  } catch (error) {
    next(error);
  }
};
