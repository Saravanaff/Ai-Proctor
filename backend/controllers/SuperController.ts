import { Request, Response } from "express";
import User from "../models/User";
import { Exam } from "../models/Exam";
import { Attend } from "../models/Attend";
import { Scores } from "../models/Scores";
import { ViolationLog } from "../models/ViolationLog";
import { UserAnswer } from "../models/UserAnswer";
import crypto from "crypto";
import { sendAdminCreationEmail } from "../utils/emailService";
import bcrypt from "bcrypt";



export const getAdminEmails = async (req: Request, res: Response) => {
  try {
    const admins = await User.findAll({
      where: {
        role: "examiner",
      },
      attributes: ["id", "name", "email", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    console.log(`📧 Found ${admins.length} admin(s)`);

    const adminEmails = admins.map((admin) => admin.email);

    return res.status(200).json({
      success: true,
      message: `Found ${admins.length} admin(s)`,
      data: {
        count: admins.length,
        emails: adminEmails,
        admins: admins.map((admin) => ({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          createdAt: admin.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin emails:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin emails",
      error: error.message,
    });
  }
};


export const getExaminerEmails = async (req: Request, res: Response) => {
  try {
    const examiners = await User.findAll({
      where: {
        role: "examiner",
      },
      attributes: ["id", "name", "email", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    console.log(`📧 Found ${examiners.length} examiner(s)`);

    const examinerEmails = examiners.map((examiner) => examiner.email);

    return res.status(200).json({
      success: true,
      message: `Found ${examiners.length} examiner(s)`,
      data: {
        count: examiners.length,
        emails: examinerEmails,
        examiners: examiners.map((examiner) => ({
          id: examiner.id,
          name: examiner.name,
          email: examiner.email,
          createdAt: examiner.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching examiner emails:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch examiner emails",
      error: error.message,
    });
  }
};


export const getAdminExams = async (req: Request, res: Response) => {
  try {
    const { adminEmail } = req.params;
    console.log(adminEmail);

    if (!adminEmail) {
      return res.status(400).json({
        success: false,
        message: "Admin email is required",
      });
    }

    const admin = await User.findOne({
      where: {
        email: adminEmail,
        role: "examiner",
      },
      attributes: ["id", "name", "email"],
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const exams = await Exam.findAll({
      where: {
        user_id: admin.id,
      },
      include: [
        {
          model: Attend,
          as: "attendances",
          attributes: ["id", "user_id", "startTime", "endTime"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`Found ${exams.length} exam(s) for admin ${admin.name}`);

    const formattedExams = exams.map((exam) => ({
      id: exam.id,
      exam_name: exam.exam_name,
      key: exam.key,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      totalParticipants: exam.attendances?.length || 0,
      participants: exam.attendances?.map((attendance) => ({
        userId: attendance.user_id,
        userName: attendance.user?.name,
        userEmail: attendance.user?.email,
        startTime: attendance.startTime,
        endTime: attendance.endTime,
      })) || [],
      settings: {
        third_eye_enabled: exam.third_eye_enabled,
        multiple_person_detection_enabled: exam.multiple_person_detection_enabled,
        eyeball_detection_enabled: exam.eyeball_detection_enabled,
        object_detection_enabled: exam.object_detection_enabled,
        head_direction_enabled: exam.head_direction_enabled,
        video_recording_enabled: exam.video_recording_enabled,
        screen_sharing_enabled: exam.screen_sharing_enabled,
      },
    }));

    return res.status(200).json({
      success: true,
      message: `Found ${exams.length} exam(s) for admin ${admin.name}`,
      data: {
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        },
        totalExams: exams.length,
        exams: formattedExams,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin exams:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin exams",
      error: error.message,
    });
  }
};


export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const { adminEmail } = req.params;

    if (!adminEmail) {
      return res.status(400).json({
        success: false,
        message: "Admin email is required",
      });
    }

    const admin = await User.findOne({
      where: {
        email: adminEmail,
        role: "examiner",
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    console.log(`🗑️ Starting deletion process for admin: ${admin.name} (${admin.email})`);

    const exams = await Exam.findAll({
      where: {
        user_id: admin.id,
      },
    });

    
    const examIds = exams.map((exam) => exam.id);
    console.log(`Found ${exams.length} exam(s) to delete`);

    if (examIds.length > 0) {
      const deletedAnswers = await UserAnswer.destroy({
        where: {
          exam_id: examIds,
        },
      });
      console.log(`Deleted ${deletedAnswers} user answer(s)`);

      const deletedViolations = await ViolationLog.destroy({
        where: {
          exam_id: examIds,
        },
      });
      console.log(`Deleted ${deletedViolations} violation log(s)`);

      const deletedScores = await Scores.destroy({
        where: {
          exam_id: examIds,
        },
      });
      console.log(`Deleted ${deletedScores} score record(s)`);

      const deletedAttendance = await Attend.destroy({
        where: {
          exam_id: examIds,
        },
      });
      console.log(`Deleted ${deletedAttendance} attendance record(s)`);

      const deletedExams = await Exam.destroy({
        where: {
          id: examIds,
        },
      });
      console.log(` Deleted ${deletedExams} exam(s)`);
    }

        await admin.destroy();
    console.log(`Deleted admin user: ${admin.name}`);

    return res.status(200).json({
      success: true,
      message: `Admin ${admin.name} and all associated data deleted successfully`,
      data: {
        deletedAdmin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        },
        deletedExamsCount: exams.length,
        summary: {
          exams: exams.length,
          userAnswers: examIds.length > 0 ? "deleted" : 0,
          violationLogs: examIds.length > 0 ? "deleted" : 0,
          scores: examIds.length > 0 ? "deleted" : 0,
          attendance: examIds.length > 0 ? "deleted" : 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error deleting admin:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete admin",
      error: error.message,
    });
  }
};

export const createAdminWithoutPassword = async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
        data: {
          existingUser: {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
          },
        },
      });
    }

    // Generate a random password (8 characters: letters + numbers)
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const randomPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    console.log(`👤 Creating admin account for: ${name} (${email})`);

    const newAdmin = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "examiner",
    });

    console.log(`✅ Admin created successfully: ${newAdmin.name} (ID: ${newAdmin.id})`);

    // Send email with credentials
    try {
      await sendAdminCreationEmail(
        newAdmin.email,
        newAdmin.name,
        newAdmin.email,
        randomPassword
      );
      console.log(`📧 Welcome email sent to ${newAdmin.email}`);
    } catch (emailError: any) {
      console.error("⚠️  Failed to send welcome email:", emailError.message);
      // Don't fail the request if email fails, but inform the user
      return res.status(201).json({
        success: true,
        message: "Admin account created successfully, but email sending failed.",
        data: {
          admin: {
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role,
            createdAt: newAdmin.createdAt,
          },
          emailSent: false,
          emailError: emailError.message,
          note: "Please manually share the login credentials with the admin.",
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully. Credentials have been sent via email.",
      data: {
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          createdAt: newAdmin.createdAt,
        },
        emailSent: true,
      },
    });
  } catch (error: any) {
    console.error("Error creating admin:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create admin account",
      error: error.message,
    });
  }
};

export const bulkCreateAdmins = async (req: Request, res: Response) => {
  try {
    const { admins } = req.body;

    if (!admins || !Array.isArray(admins) || admins.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Admins array is required and must not be empty",
      });
    }

    console.log(`📋 Attempting to create ${admins.length} admin(s) from CSV`);

    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const admin of admins) {
      try {
        const { name, email } = admin;

        if (!name || !email) {
          results.failed.push({
            email: email || "unknown",
            name: name || "unknown",
            reason: "Name and email are required",
          });
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.failed.push({
            email,
            name,
            reason: "Invalid email format",
          });
          continue;
        }

        const existingUser = await User.findOne({
          where: { email: email.toLowerCase() },
        });

        if (existingUser) {
          results.failed.push({
            email,
            name,
            reason: "User with this email already exists",
          });
          continue;
        }

        // Generate random password
        const generatePassword = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let password = '';
          for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return password;
        };

        const randomPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const newAdmin = await User.create({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: "examiner",
        });

        // Send email with credentials
        try {
          await sendAdminCreationEmail(
            newAdmin.email,
            newAdmin.name,
            newAdmin.email,
            randomPassword
          );
          results.successful.push({
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            emailSent: true,
          });
        } catch (emailError: any) {
          console.error(`⚠️  Failed to send email to ${newAdmin.email}:`, emailError.message);
          results.successful.push({
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            emailSent: false,
            emailError: emailError.message,
          });
        }
      } catch (error: any) {
        results.failed.push({
          email: admin.email,
          name: admin.name,
          reason: error.message || "Unknown error",
        });
      }
    }

    console.log(`✅ Successfully created ${results.successful.length} admin(s)`);
    console.log(`❌ Failed to create ${results.failed.length} admin(s)`);

    return res.status(200).json({
      success: true,
      message: `Processed ${admins.length} admin(s): ${results.successful.length} successful, ${results.failed.length} failed`,
      data: {
        total: admins.length,
        successful: results.successful,
        failed: results.failed,
      },
    });
  } catch (error: any) {
    console.error("Error in bulk admin creation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process bulk admin creation",
      error: error.message,
    });
  }
};


