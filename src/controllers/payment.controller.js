import stripe from "../config/stripe.js";
import Payment from "../models/payment.model.js";
import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";

/**
 * @desc    Create a Stripe Checkout session for a pending/accepted appointment.
 * @route   POST /api/payments/create-checkout-session
 * @access  Private (patient)
 */
export const createCheckoutSession = async (req, res, next) => {
  try {
    const patient = await User.findOne({ email: req.user.email });
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res
        .status(400)
        .json({ success: false, message: "appointmentId is required." });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: patient._id,
    }).populate("doctorId");

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.paymentStatus === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "This appointment is already paid." });
    }

    const doctor = appointment.doctorId;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Consultation with Dr. ${doctor.doctorName}`,
              description: `${doctor.specialization} | ${appointment.appointmentDate} at ${appointment.appointmentTime}`,
            },
            unit_amount: Math.round(doctor.consultationFee * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/payment-cancelled`,
      metadata: {
        appointmentId: appointment._id.toString(),
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
      },
    });

    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm a completed Stripe checkout session, mark appointment paid,
 *          and create the Payment record. Idempotent — safe to call more than once.
 * @route   POST /api/payments/confirm
 * @access  Private (patient)
 */
export const confirmPayment = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "sessionId is required." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not completed." });
    }

    const { appointmentId, patientId, doctorId } = session.metadata;

    const existingPayment = await Payment.findOne({
      transactionId: session.id,
    });
    if (existingPayment) {
      return res
        .status(200)
        .json({
          success: true,
          data: existingPayment,
          message: "Payment already recorded.",
        });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    appointment.paymentStatus = "paid";
    await appointment.save();

    const payment = await Payment.create({
      appointmentId,
      patientId,
      doctorId,
      amount: session.amount_total / 100,
      transactionId: session.id,
      paymentDate: new Date(),
    });

    res
      .status(201)
      .json({ success: true, data: payment, message: "Payment confirmed." });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in patient's payment history
 * @route   GET /api/payments/my
 * @access  Private (patient)
 */
export const getMyPayments = async (req, res, next) => {
  try {
    const patient = await User.findOne({ email: req.user.email });

    const payments = await Payment.find({ patientId: patient._id })
      .populate("doctorId", "doctorName specialization")
      .populate("appointmentId", "appointmentDate appointmentTime")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payment records (admin only)
 * @route   GET /api/payments
 * @access  Private (admin)
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate("patientId", "name email")
      .populate("doctorId", "doctorName specialization")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    next(error);
  }
};
