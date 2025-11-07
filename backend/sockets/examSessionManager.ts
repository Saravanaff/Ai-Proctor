import { Attend } from "../models/Attend";

export async function handleExamStart(data: any) {
  try {
    console.log(data);
    const { user_id, exam_id, timestamp } = data;
    
    if (user_id && exam_id && timestamp) {
      const localTime = timestamp;
      const startTimeDate = new Date(localTime);
      const startTime = startTimeDate.toLocaleString(); 
      
      const attendRecord = await Attend.findOne({
        where: { 
          user_id: Number(user_id),
          exam_id: Number(exam_id)
        }
      });
      
      console.log(attendRecord);
      console.log(startTime);
      
      if (attendRecord) {
        await attendRecord.update({ startTime: startTime });
      }
      
      console.log(`📊 Exam started - User: ${user_id}, Exam: ${exam_id}, Start Time: ${startTime}`);
    }
  } catch (error) {
    console.error('Error storing exam start time:', error);
  }
}

export async function handleExamEnd(data: any) {
  try {
    const { user_id, exam_id, timestamp } = data;
    console.log("endu da vendru", data);
    
    if (user_id && exam_id && timestamp) {
      const localTime = timestamp;
      const endTimeDate = new Date(localTime);
      const endTime = endTimeDate.toLocaleString();
      
      const attendRecord = await Attend.findOne({
        where: { 
          user_id: Number(user_id),
          exam_id: Number(exam_id)
        }
      });
      
      if (attendRecord) {
        await attendRecord.update({ endTime: endTime });
        console.log(`📊 Exam ended - User: ${user_id}, Exam: ${exam_id}, End Time: ${endTime}`);
      } else {
        console.warn(`⚠️ No attend record found for User: ${user_id}, Exam: ${exam_id}`);
      }
    }
  } catch (error) {
    console.error('Error storing exam end time:', error);
  }
}
