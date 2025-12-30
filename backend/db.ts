import "reflect-metadata";
import { Sequelize } from "sequelize-typescript";
import { User } from "./models/User";
import { Exam } from "./models/Exam";
import { Attend } from "./models/Attend";
import { Scores } from "./models/Scores";
import { ViolationLog } from "./models/ViolationLog";
import { Question } from "./models/Questions";
import { QuestionOption } from "./models/QuestionOption";
import { UserAnswer } from "./models/UserAnswer";
import { Otp } from "./models/Otp";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: "postgres",

  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    connectTimeout: 60000, // 60 seconds
  },

  pool: {
    max: 10, // Increased from 5
    min: 2, // Keep minimum connections alive
    acquire: 60000, // 60 seconds - maximum time to acquire connection
    idle: 10000, // 10 seconds - maximum time connection can be idle
    evict: 1000, // Check for idle connections every second
  },

  logging: false,

  // Retry configuration for cloud environments
  retry: {
    max: 3, // Retry failed queries up to 3 times
  },

  models: [
    User,
    Exam,
    Attend,
    Scores,
    ViolationLog,
    Question,
    QuestionOption,
    UserAnswer,
    Otp,
  ],
});
