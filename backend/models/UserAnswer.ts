import {
  Table,
  Column,
  Model,
  ForeignKey,
  DataType,
  BelongsTo,
  PrimaryKey,
  AutoIncrement,
  Default,
} from 'sequelize-typescript';
import { User } from './User';
import { Exam } from './Exam';
import { Question } from './Questions';
import { QuestionOption } from './QuestionOption';

@Table({
  tableName: 'UserAnswers',
  timestamps: false,
})
export class UserAnswer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  answer_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id!: number;

  @ForeignKey(() => Exam)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  exam_id!: number;

  @ForeignKey(() => Question)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  question_id!: number;

  @ForeignKey(() => QuestionOption)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  selected_option_id?: number | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  written_answer?: string | null;

  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  answered_at!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Exam)
  exam!: Exam;

  @BelongsTo(() => Question)
  question!: Question;

  @BelongsTo(() => QuestionOption)
  selected_option?: QuestionOption;
}
