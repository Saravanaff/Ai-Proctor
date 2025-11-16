import { Request, Response } from "express";
import otpGenerator from "otp-generator";
import { Otp } from "../models/Otp";
import { sendOtpEmail } from "../utils/emailService";
import { Op } from "sequelize";

// Generate and send OTP
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing unverified OTPs for this email
    await Otp.destroy({
      where: {
        email: email.toLowerCase(),
        verified: false,
      },
    });

    // Save OTP to database
    await Otp.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      verified: false,
    } as any);

    // Send OTP via email
    await sendOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      expiresIn: "10 minutes",
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

// Verify OTP
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find the OTP record
    const otpRecord = await Otp.findOne({
      where: {
        email: email.toLowerCase(),
        otp,
        verified: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await otpRecord.destroy();
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

// Resend OTP
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Delete any existing unverified OTPs for this email
    await Otp.destroy({
      where: {
        email: email.toLowerCase(),
        verified: false,
      },
    });

    // Generate new OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Save new OTP to database
    await Otp.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      verified: false,
    } as any);

    // Send OTP via email
    await sendOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully to your email",
      expiresIn: "10 minutes",
    });
  } catch (error: any) {
    console.error("Error resending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};

// Send OTP for forgot password
export const sendForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing unverified OTPs for this email
    await Otp.destroy({
      where: {
        email: email.toLowerCase(),
        verified: false,
      },
    });

    // Save OTP to database
    await Otp.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      verified: false,
    } as any);

    // Send OTP via email
    await sendOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email for password reset",
      expiresIn: "10 minutes",
    });
  } catch (error: any) {
    console.error("Error sending forgot password OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

// Verify OTP for forgot password
export const verifyForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find the OTP record
    const otpRecord = await Otp.findOne({
      where: {
        email: email.toLowerCase(),
        otp,
        verified: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await otpRecord.destroy();
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Mark OTP as verified (don't delete it yet, we need it for password reset)
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
    });
  } catch (error: any) {
    console.error("Error verifying forgot password OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

// Clean up expired OTPs (can be called periodically)
export const cleanupExpiredOtps = async (req: Request, res: Response) => {
  try {
    const deleted = await Otp.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });

    res.status(200).json({
      success: true,
      message: `Cleaned up ${deleted} expired OTPs`,
    });
  } catch (error: any) {
    console.error("Error cleaning up OTPs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup expired OTPs",
      error: error.message,
    });
  }
};
