import "reflect-metadata";
import { Sequelize } from 'sequelize-typescript';
import {User} from './models/User';

export const sequelize = new Sequelize({
  database: 'test',
  dialect: 'mysql',
  username: 'root',
  password: '',
  models: [User],
});
