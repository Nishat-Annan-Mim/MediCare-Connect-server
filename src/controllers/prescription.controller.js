import Prescription from "../models/prescription.model.js";
import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";

/**
 * @desc    Create a prescription for a completed appointment.
 *          Only the doctor who owns that appointment can create it.
 * @route   POST /api/prescriptions
 * @access  Private (doctor)
 */
export const createPrescription = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const { appointmentId, diagnosis, medications, notes } = req.body;

    if (!appointmentId || !diagnosis) {
      return res.status(400).json({ success: false, message: "appointmentId and diagnosis are required." });
    }

    const appointment = await Appointment.findOne({ _id: appointmentId, doctorId: doctor._id });
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    if (appointment.appointmentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "A prescription can only be created for a completed appointment.",
      });
    }

    const existing = await Prescription.findOne({ appointmentId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A prescription already exists for this appointment. Use update instead.",
      });
    }

    const prescription = await Prescription.create({
      doctorId: doctor._id,
      patientId: appointment.patientId,
      appointmentId,
      diagnosis,
      medications: medications || [],
      notes: notes || "",
    });

    res.status(201).json({ success: true, data: prescription, message: "Prescription created." });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing prescription (doctor who created it only)
 * @route   PATCH /api/prescriptions/:id
 * @access  Private (doctor)
 */
export const updatePrescription = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const { diagnosis, medications, notes } = req.body;

    const prescription = await Prescription.findOne({ _id: req.params.id, doctorId: doctor._id });
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found." });
    }

    if (diagnosis !== undefined) prescription.diagnosis = diagnosis;
    if (medications !== undefined) prescription.medications = medications;
    if (notes !== undefined) prescription.notes = notes;
    await prescription.save();

    res.status(200).json({ success: true, data: prescription, message: "Prescription updated." });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single prescription by its linked appointment ID.
 *          Accessible by the patient or doctor involved.
 * @route   GET /api/prescriptions/appointment/:appointmentId
 * @access  Private (patient or doctor involved)
 */
export const getPrescriptionByAppointment = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({ appointmentId: req.params.appointmentId })
      .populate("doctorId", "doctorName specialization hospitalName")
      .populate("patientId", "name email");

    if (!prescription) {
      return res.status(404).json({ success: false, message: "No prescription found for this appointment." });
    }

    const user = await User.findOne({ email: req.user.email });
    const isPatient = prescription.patientId._id.toString() === user._id.toString();

    const doctor = await Doctor.findOne({ userId: user._id });
    const isDoctor = doctor && prescription.doctorId._id.toString() === doctor._id.toString();

    if (!isPatient && !isDoctor && user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view this prescription." });
    }

    res.status(200).json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all prescriptions written by the logged-in doctor
 * @route   GET /api/prescriptions/doctor
 * @access  Private (doctor)
 */
export const getDoctorPrescriptions = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const prescriptions = await Prescription.find({ doctorId: doctor._id })
      .populate("patientId", "name email photo")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all prescriptions for the logged-in patient
 * @route   GET /api/prescriptions/patient
 * @access  Private (patient)
 */
export const getPatientPrescriptions = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });

    const prescriptions = await Prescription.find({ patientId: user._id })
      .populate("doctorId", "doctorName specialization profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    next(error);
  }
};