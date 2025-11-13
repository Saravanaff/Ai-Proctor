import { Router } from "express";
import {
  sendOtp,
  verifyOtp,
  resendOtp,
  cleanupExpiredOtps,
} from "../controllers/OtpController";

const router = Router();

// Send OTP to email
router.post("/send", sendOtp as any);

// Verify OTP
router.post("/verify", verifyOtp as any);

// Resend OTP
router.post("/resend", resendOtp as any);

// Cleanup expired OTPs (admin route)
router.delete("/cleanup", cleanupExpiredOtps as any);

export default router;
