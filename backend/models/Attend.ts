import { Table, Model, Column, DataType, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { User } from './User';
import { Exam } from './Exam';

@Table({
    tableName: "Attend",
    timestamps: true
})
export class Attend extends Model {

    @Column({
        type:DataType.INTEGER,
        primaryKey:true,
        autoIncrement:true,
        allowNull:false
    })
    id!:number

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    user_id!: number;

    @ForeignKey(() => Exam)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    exam_id!: number;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    startTime?: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    endTime?: Date;

    @BelongsTo(() => User)
    user!: User;

    @BelongsTo(() => Exam)
    exam!: Exam;
}