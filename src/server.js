import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import prescriptionRoutes from "./routes/prescription.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ---------- Routes ----------
app.use("/api/health", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/payments", paymentRoutes);

// ---------- Error Handling ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Start Server ----------
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
