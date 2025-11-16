import { Router } from "express";
import {
  sendOtp,
  verifyOtp,
  resendOtp,
  cleanupExpiredOtps,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
} from "../controllers/OtpController";
import {
  resetPassword,
  checkEmailExists,
} from "../controllers/PasswordController";

const router = Router();

// Send OTP to email
router.post("/send", sendOtp as any);

// Verify OTP
router.post("/verify", verifyOtp as any);

// Resend OTP
router.post("/resend", resendOtp as any);

// Forgot Password - Send OTP
router.post("/forgot-password/send", sendForgotPasswordOtp as any);

// Forgot Password - Verify OTP
router.post("/forgot-password/verify", verifyForgotPasswordOtp as any);

// Reset Password
router.post("/reset-password", resetPassword as any);

// Check if email exists
router.post("/check-email", checkEmailExists as any);

// Cleanup expired OTPs (admin route)
router.delete("/cleanup", cleanupExpiredOtps as any);

export default router;
