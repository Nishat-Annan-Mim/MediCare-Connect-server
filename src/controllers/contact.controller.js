import ContactMessage from "../models/contactMessage.model.js";

export const submitContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are all required.",
      });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      data: contactMessage,
      message: "Your message has been sent. We'll get back to you soon.",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    next(error);
  }
};
