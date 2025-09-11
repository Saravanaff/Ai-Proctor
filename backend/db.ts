import "reflect-metadata";
import { Sequelize } from 'sequelize-typescript';
import { User } from './models/User';
import { Exam } from "../backend/models/Exam";;
import { Attend } from "./models/Attend";
import {Scores} from "./models/Scores";
import { ViolationLog } from "./models/ViolationLog";
export const sequelize = new Sequelize({
  database: 'test',
  dialect: 'mysql',
  username: 'root',
  password: '',
  models: [User, Exam, Attend,Scores,ViolationLog],
});
