import User from "../models/user.model.js";

/**
 * @desc    Create or sync a user record after Better Auth signup/login.
 *          If the user already exists (matched by email), return it.
 *          Otherwise create a new one.
 * @route   POST /api/users
 * @access  Public (called right after Better Auth login/register on the client)
 */
export const syncUser = async (req, res, next) => {
  try {
    const { name, email, photo, role } = req.body;

    if (!email || !name) {
      return res
        .status(400)
        .json({ success: false, message: "Name and email are required." });
    }

    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(200)
        .json({ success: true, data: user, message: "User already exists." });
    }

    user = await User.create({
      name,
      email,
      photo: photo || "",
      role: role && ["patient", "doctor"].includes(role) ? role : "patient",
    });

    res
      .status(201)
      .json({
        success: true,
        data: user,
        message: "User created successfully.",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in user's own profile
 * @route   GET /api/users/me
 * @access  Private
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update the logged-in user's own profile
 * @route   PATCH /api/users/me
 * @access  Private
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const { name, photo, phone, gender } = req.body;

    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { name, photo, phone, gender } },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res
      .status(200)
      .json({ success: true, data: user, message: "Profile updated." });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private (admin)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (admin)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Suspend or reactivate a user (admin only)
 * @route   PATCH /api/users/:id/status
 * @access  Private (admin)
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // "active" | "suspended"

    if (!["active", "suspended"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res
      .status(200)
      .json({ success: true, data: user, message: `User ${status}.` });
  } catch (error) {
    next(error);
  }
};
