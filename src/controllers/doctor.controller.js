import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";

/**
 * @desc    Get all VERIFIED doctors with search, sort, and pagination.
 *          Query params:
 *            - search: matches name or specialization (case-insensitive)
 *            - specialization: exact filter
 *            - sortBy: "fee" | "experience" | "rating" (default: newest)
 *            - order: "asc" | "desc" (default: "asc")
 *            - page, limit: pagination (defaults: page=1, limit=8)
 * @route   GET /api/doctors
 * @access  Public
 */
export const getAllDoctors = async (req, res, next) => {
  try {
    const {
      search,
      specialization,
      sortBy,
      order = "asc",
      page = 1,
      limit = 8,
    } = req.query;

    const query = { verificationStatus: "verified" };

    if (search) {
      query.$or = [
        { doctorName: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
      ];
    }

    if (specialization) {
      query.specialization = { $regex: `^${specialization}$`, $options: "i" };
    }

    const sortOptions = {};
    const sortDirection = order === "desc" ? -1 : 1;

    if (sortBy === "fee") {
      sortOptions.consultationFee = sortDirection;
    } else if (sortBy === "experience") {
      sortOptions.experience = sortDirection;
    } else if (sortBy === "rating") {
      sortOptions.averageRating = sortDirection;
    } else {
      sortOptions.createdAt = -1; // newest first by default
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 8, 1);
    const skip = (pageNum - 1) * limitNum;

    const [doctors, totalCount] = await Promise.all([
      Doctor.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Doctor.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: doctors,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single doctor by ID (public doctor details page)
 * @route   GET /api/doctors/:id
 * @access  Public
 */
export const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in doctor's own profile (by their userId)
 * @route   GET /api/doctors/me
 * @access  Private (doctor)
 */
export const getMyDoctorProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found." });
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a doctor profile (registering as a doctor).
 *          Sets verificationStatus to "pending" by default — admin must verify.
 * @route   POST /api/doctors
 * @access  Private (logged-in user creating their doctor profile)
 */
export const createDoctorProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const existing = await Doctor.findOne({ userId: user._id });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Doctor profile already exists." });
    }

    const {
      doctorName,
      specialization,
      qualifications,
      experience,
      consultationFee,
      hospitalName,
      profileImage,
      availableDays,
      availableSlots,
    } = req.body;

    const doctor = await Doctor.create({
      userId: user._id,
      doctorName,
      specialization,
      qualifications,
      experience,
      consultationFee,
      hospitalName,
      profileImage,
      availableDays,
      availableSlots,
      verificationStatus: "pending",
    });

    // Promote the user's role to "doctor" so the dashboard routes apply,
    // even though they're not verified yet.
    user.role = "doctor";
    await user.save();

    res
      .status(201)
      .json({
        success: true,
        data: doctor,
        message: "Doctor profile submitted for verification.",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update the logged-in doctor's own profile
 * @route   PATCH /api/doctors/me
 * @access  Private (doctor)
 */
export const updateMyDoctorProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const allowedUpdates = [
      "qualifications",
      "experience",
      "consultationFee",
      "availableDays",
      "availableSlots",
      "hospitalName",
      "profileImage",
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const doctor = await Doctor.findOneAndUpdate(
      { userId: user._id },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found." });
    }

    res
      .status(200)
      .json({
        success: true,
        data: doctor,
        message: "Doctor profile updated.",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all doctors regardless of verification status (admin only)
 * @route   GET /api/doctors/admin/all
 * @access  Private (admin)
 */
export const getAllDoctorsForAdmin = async (req, res, next) => {
  try {
    const doctors = await Doctor.find()
      .populate("userId", "name email status")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a doctor's verification status (admin only)
 * @route   PATCH /api/doctors/:id/verify
 * @access  Private (admin)
 */
export const updateDoctorVerification = async (req, res, next) => {
  try {
    const { verificationStatus } = req.body; // "verified" | "rejected" | "pending"

    if (!["verified", "rejected", "pending"].includes(verificationStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification status." });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { verificationStatus },
      { new: true, runValidators: true },
    );

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }

    res
      .status(200)
      .json({
        success: true,
        data: doctor,
        message: `Doctor ${verificationStatus}.`,
      });
  } catch (error) {
    next(error);
  }
};
