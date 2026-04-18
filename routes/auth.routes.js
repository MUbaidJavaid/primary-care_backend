const router = require("express").Router();
const {
  register,
  publicRegister,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", protect, authLimiter, register);
router.post("/public-register", authLimiter, publicRegister);
router.post("/login", authLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/verify-reset-otp", authLimiter, verifyResetOtp);
router.post("/reset-password", authLimiter, resetPassword);
router.get("/me", protect, getMe);

module.exports = router;
