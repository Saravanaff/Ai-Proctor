import { Table, Column, Model, DataType, ForeignKey, BelongsTo,HasMany } from 'sequelize-typescript';
import { Exam } from './Exam';
import QuestionOption from './QuestionOption';

@Table({
    tableName: 'Question',
    timestamps: true,
})
export class Question extends Model {
    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
    })
    id!: number;

    @ForeignKey(() => Exam)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    exam_id!: number;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    question_text!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        comment: 'Correct answer (for MCQ store option key or text, for subjective store empty or expected answer)',
    })
    answer!: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 1,
    })
    marks!: number;


    @BelongsTo(() => Exam)
    exam!: Exam;


    @HasMany(()=>QuestionOption)
    options?:QuestionOption[]
}

export default Question;