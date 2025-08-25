import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, Unique, AllowNull, HasMany } from "sequelize-typescript";
import { Exam } from "./Exam";
import { Attend } from "./Attend";
import { Scores } from './Scores';

export enum UserRole {
  STUDENT = "student",
  ADMIN = "examiner",
}

@Table({ tableName: "Users", timestamps: true })
export class User extends Model{
  @Column({
    type: DataType.INTEGER,
    primaryKey:true,
    autoIncrement:true
  })
  
  id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password!: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.STUDENT,
  })
  role!: UserRole;

  @HasMany(() => Exam)
  exams!: Exam[];

  @HasMany(() => Attend)
  attendances!: Attend[];

  @HasMany(() => Scores, { foreignKey: 'userId' })
  scores!: Scores[];
}

export default User;