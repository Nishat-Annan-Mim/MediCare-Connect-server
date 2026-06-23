import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";

const getCurrentUser = async (req) => {
  return User.findOne({ email: req.user.email });
};

/**
 * @desc    Book a new appointment (created as pending / unpaid)
 * @route   POST /api/appointments
 * @access  Private (patient)
 */
export const createAppointment = async (req, res, next) => {
  try {
    const patient = await getCurrentUser(req);
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const { doctorId, appointmentDate, appointmentTime, symptoms } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: "doctorId, appointmentDate, and appointmentTime are required.",
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.verificationStatus !== "verified") {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found or not verified." });
    }

    const slotTaken = await Appointment.findOne({
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentStatus: { $in: ["pending", "accepted"] },
    });

    if (slotTaken) {
      return res
        .status(409)
        .json({
          success: false,
          message: "This time slot is no longer available.",
        });
    }

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId,
      appointmentDate,
      appointmentTime,
      symptoms: symptoms || "",
      appointmentStatus: "pending",
      paymentStatus: "unpaid",
    });

    res
      .status(201)
      .json({
        success: true,
        data: appointment,
        message: "Appointment requested.",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in patient's own appointments
 * @route   GET /api/appointments/my
 * @access  Private (patient)
 */
export const getMyAppointments = async (req, res, next) => {
  try {
    const patient = await getCurrentUser(req);
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate(
        "doctorId",
        "doctorName specialization profileImage consultationFee hospitalName",
      )
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get appointment requests for the logged-in doctor
 * @route   GET /api/appointments/doctor
 * @access  Private (doctor)
 */
export const getDoctorAppointments = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
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

    const { status } = req.query;

    const query = { doctorId: doctor._id };
    if (status) query.appointmentStatus = status;

    const appointments = await Appointment.find(query)
      .populate("patientId", "name email photo phone")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Patient reschedules their own pending/accepted appointment
 * @route   PATCH /api/appointments/:id/reschedule
 * @access  Private (patient, must own the appointment)
 */
export const rescheduleAppointment = async (req, res, next) => {
  try {
    const patient = await getCurrentUser(req);
    const { appointmentDate, appointmentTime } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res
        .status(400)
        .json({ success: false, message: "New date and time are required." });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: patient._id,
    });
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (!["pending", "accepted"].includes(appointment.appointmentStatus)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This appointment can no longer be rescheduled.",
        });
    }

    appointment.appointmentDate = appointmentDate;
    appointment.appointmentTime = appointmentTime;
    appointment.appointmentStatus = "pending";
    await appointment.save();

    res
      .status(200)
      .json({
        success: true,
        data: appointment,
        message: "Appointment rescheduled.",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Patient cancels their own appointment
 * @route   PATCH /api/appointments/:id/cancel
 * @access  Private (patient, must own the appointment)
 */
export const cancelAppointment = async (req, res, next) => {
  try {
    const patient = await getCurrentUser(req);

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: patient._id,
    });
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.appointmentStatus === "completed") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Completed appointments cannot be cancelled.",
        });
    }

    appointment.appointmentStatus = "cancelled";
    await appointment.save();

    res
      .status(200)
      .json({
        success: true,
        data: appointment,
        message: "Appointment cancelled.",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Doctor updates appointment status: accept, reject, or mark completed
 * @route   PATCH /api/appointments/:id/status
 * @access  Private (doctor, must own the appointment)
 */
export const updateAppointmentStatusByDoctor = async (req, res, next) => {
  try {
    const { appointmentStatus } = req.body;

    if (!["accepted", "rejected", "completed"].includes(appointmentStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }

    const user = await getCurrentUser(req);
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found." });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: doctor._id,
    });
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (
      appointmentStatus === "completed" &&
      appointment.paymentStatus !== "paid"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot complete an unpaid appointment.",
      });
    }

    appointment.appointmentStatus = appointmentStatus;
    await appointment.save();

    res.status(200).json({
      success: true,
      data: appointment,
      message: `Appointment marked as ${appointmentStatus}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all appointments (admin only)
 * @route   GET /api/appointments
 * @access  Private (admin)
 */
export const getAllAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find()
      .populate("patientId", "name email")
      .populate("doctorId", "doctorName specialization")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    next(error);
  }
};
