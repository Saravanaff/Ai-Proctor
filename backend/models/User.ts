import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, Unique, AllowNull } from "sequelize-typescript";

export enum UserRole {
  STUDENT = "student",
  ADMIN = "admin",
}

@Table({ tableName: "users", timestamps: true })
export class User extends Model<User> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey:true
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
}

export default User;