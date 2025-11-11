import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  HasMany,
} from "sequelize-typescript";
import { Question } from "./Questions";

@Table({
  tableName: "QuestionOption",
  timestamps: true,
})
export class QuestionOption extends Model<QuestionOption> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Question)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  question_id!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  option_text!: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_correct!: boolean;

  @BelongsTo(() => Question)
  question!: Question;
}

export default QuestionOption;
