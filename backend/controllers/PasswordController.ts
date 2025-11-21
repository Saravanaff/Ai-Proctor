import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { Otp } from "../models/Otp";

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const passwordChecks = {
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    };

    if (
      !passwordChecks.upper ||
      !passwordChecks.lower ||
      !passwordChecks.number ||
      !passwordChecks.special
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must include uppercase, lowercase, number, and special character",
      });
    }

    // Find the verified OTP record
    const otpRecord = await Otp.findOne({
      where: {
        email: email.toLowerCase(),
        otp,
        verified: true,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified OTP. Please verify OTP first.",
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

    // Find the user
    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await user.update({
      password: hashedPassword,
    });

    // Delete the used OTP
    await otpRecord.destroy();

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

// Check if email exists (for forgot password flow)
export const checkEmailExists = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address",
      });
    }

    res.status(200).json({
      success: true,
      message: "Email exists",
      exists: true,
    });
  } catch (error: any) {
    console.error("Error checking email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check email",
      error: error.message,
    });
  }
};
