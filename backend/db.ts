import "reflect-metadata";
import { Sequelize } from 'sequelize-typescript';
import { User } from './models/User';
import { Exam } from "../backend/models/Exam";
import { Attend } from "./models/Attend";
export const sequelize = new Sequelize({
  database: 'test',
  dialect: 'mysql',
  username: 'root',
  password: '',
  models: [User, Exam, Attend],
});
