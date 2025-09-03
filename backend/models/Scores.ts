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
  user_id!: number;

  @AllowNull(false)
  @ForeignKey(()=>Exam)
  @Column(DataType.INTEGER)
  exam_id!:number

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  no_of_person_flagged!: number;

  @AllowNull(false)
  @Column({
    type:DataType.INTEGER,
    defaultValue:0
  })
  no_person_flagged!:number

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  auth_face_flagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  head_position_flagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  eyes_flagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  object_detected_flagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  total_images_processed!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  sound_flagged!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  total_score!: number;
}

export default Scores;