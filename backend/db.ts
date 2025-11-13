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

export const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  dialect: "mysql",
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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
