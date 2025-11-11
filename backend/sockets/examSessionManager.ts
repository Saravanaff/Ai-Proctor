import { Attend } from "../models/Attend";

export async function handleExamStart(data: any) {
  try {
    console.log("📥 Received exam start data:", data);
    const { user_id, exam_id, timestamp } = data;
    
    console.log("🔍 Timestamp details:", {
      raw: timestamp,
      type: typeof timestamp,
      isDate: timestamp instanceof Date,
      isString: typeof timestamp === 'string'
    });
    
    if (!user_id || !exam_id || !timestamp) {
      console.error('❌ Missing required data for exam start:', { user_id, exam_id, timestamp });
      return;
    }
    
    const startTime = new Date(timestamp);
    
    // Validate the date
    if (isNaN(startTime.getTime())) {
      console.error('❌ Invalid timestamp provided:', timestamp);
      return;
    }
    
    console.log('✅ Parsed startTime:', {
      dateObject: startTime,
      iso: startTime.toISOString(),
      unix: startTime.getTime()
    });
    
    const attendRecord = await Attend.findOne({
      where: { 
        user_id: Number(user_id),
        exam_id: Number(exam_id)
      }    // Only pause if face authentication is enabled and exam has started

    });
    
    if (attendRecord) {
      await attendRecord.update({ startTime });
      console.log(`✅ Exam started - User: ${user_id}, Exam: ${exam_id}, Start Time: ${startTime.toISOString()}`);
    } else {
      console.warn(`⚠️ No attend record found for User: ${user_id}, Exam: ${exam_id}`);
    }
  } catch (error) {
    console.error('❌ Error storing exam start time:', error);
  }
}

export async function handleExamEnd(data: any) {
  try {
    console.log("📥 Received exam end data:", data);
    const { user_id, exam_id, timestamp } = data;
    
    console.log("🔍 Timestamp details:", {
      raw: timestamp,
      type: typeof timestamp,
      isDate: timestamp instanceof Date,
      isString: typeof timestamp === 'string'
    });
    
    if (!user_id || !exam_id || !timestamp) {
      console.error('❌ Missing required data for exam end:', { user_id, exam_id, timestamp });
      return;
    }
    
    const endTime = new Date(timestamp);
    
    // Validate the date
    if (isNaN(endTime.getTime())) {
      console.error('❌ Invalid timestamp provided:', timestamp);
      return;
    }
    
    console.log('✅ Parsed endTime:', {
      dateObject: endTime,
      iso: endTime.toISOString(),
      unix: endTime.getTime()
    });
    
    const attendRecord = await Attend.findOne({
      where: { 
        user_id: Number(user_id),
        exam_id: Number(exam_id)
      }
    });
    
    if (attendRecord) {
      await attendRecord.update({ endTime });
      console.log(`✅ Exam ended - User: ${user_id}, Exam: ${exam_id}, End Time: ${endTime.toISOString()}`);
      
      // Calculate and log duration if startTime exists
      if (attendRecord.startTime) {
        const duration = endTime.getTime() - new Date(attendRecord.startTime).getTime();
        const durationMinutes = (duration / 1000 / 60).toFixed(2);
        const durationSeconds = (duration / 1000).toFixed(2);
        console.log(`📊 Exam duration: ${durationMinutes} minutes (${durationSeconds} seconds)`);
      }
    } else {
      console.warn(`⚠️ No attend record found for User: ${user_id}, Exam: ${exam_id}`);
    }
  } catch (error) {
    console.error('❌ Error storing exam end time:', error);
  }
}
