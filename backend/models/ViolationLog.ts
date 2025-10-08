import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { Exam } from './Exam';

@Table({
  tableName: 'ViolationLog',
  timestamps: true
})
export class ViolationLog extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  })
  id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  @ForeignKey(() => User)
  user_id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  @ForeignKey(() => Exam)
  exam_id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  violation_name!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  violation_timestamp!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Exam)
  exam!: Exam;
}
