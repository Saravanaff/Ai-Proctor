import {Table,Model,Column, DataType, ForeignKey, BelongsTo,HasMany} from 'sequelize-typescript';
import {User} from './User';
import { Attend } from './Attend';
import { Scores } from './Scores';
import Question from './Questions';

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

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    third_eye_enabled!:boolean

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    multiple_person_detection_enabled!:boolean


    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    eyeball_detection_enabled!:boolean


    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    object_detection_enabled!:boolean


    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    head_direction_enabled!:boolean


    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    flag_notifications_enabled!:boolean


    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    video_recording_enabled!:boolean

    
    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    tab_switch_detection_enabled!:boolean
    

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    microphone_detection_enabled!:boolean
    

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    safe_browser_enabled!:boolean
    

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    proctor_feed_to_test_taker_enabled!:boolean
    

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    screen_sharing_enabled!:boolean
    
    
    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:false })
    screen_count_detection_enabled!:boolean
    

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:false })
    control_desktop_apps_enabled!:boolean
    

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    normal_proctoring!:boolean


    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    ai_powered_proctoring!:boolean


    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:true })
    recorded_manual_proctoring!:boolean

    @Column({ type:DataType.BOOLEAN, allowNull:false, defaultValue:false })
    face_authentication_enabled!:boolean
    

    @BelongsTo(() => User)
    user!: User;

    @HasMany(() => Attend)
    attendances?: Attend[];

    @HasMany(() => Scores)
    scores?: Scores[];

    @HasMany(()=> Question)
    questions?:Question[];
    
}
