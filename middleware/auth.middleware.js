const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized — no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type && decoded.type !== "access") {
      return res.status(401).json({ message: "Invalid access token type" });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ message: "Not authorized — user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized — invalid token" });
  }
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    return res
      .status(403)
      .json({ message: "Access denied — insufficient permissions" });
  };

const adminOnly = requireRole("admin", "superadmin");

module.exports = { protect, requireRole, adminOnly };
