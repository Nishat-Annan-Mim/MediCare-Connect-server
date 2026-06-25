import User from "../models/user.model.js";

const AUTH_BASE_URL =
  process.env.BETTER_AUTH_BASE_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:3000";

/**
 * Verifies the request is authenticated by asking the Next.js client's
 * Better Auth instance to validate the forwarded session cookie.
 *
 * Attaches req.user = { id, email, name, role } where role comes from our
 * own Users collection (looked up by email), so role changes made via
 * admin actions take effect immediately.
 */
export const verifyToken = async (req, res, next) => {
  try {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      return res
        .status(401)
        .json({ message: "Access denied. No session cookie provided." });
    }

    const response = await fetch(`${AUTH_BASE_URL}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
    });

    if (!response.ok) {
      return res
        .status(401)
        .json({ message: "Access denied. Invalid session." });
    }

    const sessionData = await response.json();

    if (!sessionData || !sessionData.user) {
      return res
        .status(401)
        .json({ message: "Access denied. No active session." });
    }

    const dbUser = await User.findOne({ email: sessionData.user.email });

    if (!dbUser) {
      return res.status(404).json({ message: "User record not found." });
    }

    if (dbUser.status === "suspended") {
      return res
        .status(403)
        .json({ message: "Your account has been suspended." });
    }

    req.user = {
      id: dbUser._id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
    };

    next();
  } catch (error) {
    console.error("Auth verification error:", error.message);
    return res.status(500).json({ message: "Authentication check failed." });
  }
};

export const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden. Insufficient permissions." });
    }
    next();
  };
};
