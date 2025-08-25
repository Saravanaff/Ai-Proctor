import { Table, Column, Model, PrimaryKey, AutoIncrement, AllowNull, DataType, ForeignKey, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import User from "./User"
import { Exam } from './Exam';

@Table({
  tableName: 'scores',
  timestamps: true,
})
export class Scores extends Model<Scores> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId!: number;

  @AllowNull(false)
  @ForeignKey(()=>Exam)
  @Column(DataType.INTEGER)
  exam_id!:number

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  noOfPersonFlagged!: number;

  @AllowNull(false)
  @Column({
    type:DataType.INTEGER,
    defaultValue:0
  })
  noPersonFlagged!:number

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  authFaceFlagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  headPositionFlagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  eyesFlagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  objectDetectedFlagged!: number;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt!: Date;
}

export default Scores;