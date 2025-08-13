import {Table,Model,Column, DataType, ForeignKey, BelongsTo} from 'sequelize-typescript';
import {User} from './User';

@Table({
    tableName:"Exam"
})
export class Exam extends Model{
    @Column({
        type:DataType.INTEGER,
        primaryKey:true,
        allowNull:false,
        autoIncrement:true
    })
    id!:number

    @Column({
        type:DataType.INTEGER,
        allowNull:false
    })
    @ForeignKey(() => User)
    user_id!:number

    @Column({
        type:DataType.STRING,
        allowNull:false
    })
    exam_name!:string

    @Column({
        type:DataType.INTEGER,
        unique:true,
        allowNull:false
    })
    key!:number

    @BelongsTo(() => User)
    user!: User;
}
