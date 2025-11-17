import { Request, Response } from "express";
import User from "../models/User";
import { Exam } from "../models/Exam";
import { Attend } from "../models/Attend";
import { Scores } from "../models/Scores";
import { ViolationLog } from "../models/ViolationLog";
import { UserAnswer } from "../models/UserAnswer";



export const getAdminEmails = async (req: Request, res: Response) => {
  try {
    const admins = await User.findAll({
      where: {
        role: "admin",
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

    if (!adminEmail) {
      return res.status(400).json({
        success: false,
        message: "Admin email is required",
      });
    }

    const admin = await User.findOne({
      where: {
        email: adminEmail,
        role: "admin",
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
        role: "admin",
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

      // Delete all scores for these exams
      const deletedScores = await Scores.destroy({
        where: {
          exam_id: examIds,
        },
      });
      console.log(`Deleted ${deletedScores} score record(s)`);

      // Delete all attendance records for these exams
      const deletedAttendance = await Attend.destroy({
        where: {
          exam_id: examIds,
        },
      });
      console.log(`Deleted ${deletedAttendance} attendance record(s)`);

      // Delete all exams
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

