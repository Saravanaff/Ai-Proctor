let user = new Map();

export function addScore(data: any) {
  const userId = String(data?.userId ?? data?.user_id ?? "");
  const examId = String(data?.examId ?? data?.exam_id ?? "");
  if (!userId || !examId) return null;

  if (!user.has(userId)) user.set(userId, new Map());


  const exams = user.get(userId);



  if (!exams.has(examId)) {
    exams.set(examId, {
      noOfPersonFlagged: 0,
      authFaceFlagged: 0,
      noPersonFlagged: 0,
      headPositionFlagged: 0,
      eyesFlagged: 0,
      objectDetectedFlagged: 0,
      totalImagesProcessed: 0,
      soundFlagged: 0,
      authFrames:0,
      headFrames:0,
      eyeFrames:0,
      objectFrames:0,
      zeroPersonFrames:0,
      morePersonFrames:0
    });
  }

  const examData = exams.get(examId);

  const headPos = data?.head_position ?? data?.headPosition;


  if(data.soundDetected && data.soundDetected === true){
    examData.soundFlagged += 1;
    exams.set(examId, examData);
    user.set(userId, exams);
    return ;
  }

  examData.totalImagesProcessed += 1;

  if (typeof headPos === "string" && (headPos.toLowerCase() !== "forward" && headPos.toLowerCase() !== "down")) {
    examData.headFrames+=1;
    if(examData.headFrames%10==0){
      examData.headPositionFlagged+=1;
      examData.headFrames=0;
    }

  }
  else{
    examData.headFrames=0;
  }

  const eyes = data?.eyes;
  if (Array.isArray(eyes) && eyes.length) {
    const anyOffCenter = eyes.some(
      (e) => String(e ?? "").toLowerCase() !== "center"
    );
    if (anyOffCenter) examData.eyesFlagged += 1;
  } else if (typeof eyes === "string") {
    if (eyes.toLowerCase() !== "center" && eyes.toLowerCase() !== "down"){
      examData.eyeFrames+=1;
      if(examData.eyeFrames%10==0){
        examData.eyesFlagged+=1;
        examData.eyeFrames=0;
      }
    }
    else{
      examData.eyeFrames=0;
    }
  }

  if (data?.object_detected["cell phone"] === true) {
    examData.objectDetectedFlagged += 1;
  }

  if ( data?.auth_face === false) {
    examData.authFrames += 1;
    if(examData.authFrames%10==0){
      examData.authFaceFlagged+=1;
      examData.authFrames=0;
    }
  }
  else{
    examData.authFrames=0;
  }

  const personsRaw = data?.no_of_person;
  const persons = Number(personsRaw);
  if (Number.isFinite(persons)) {
    if (persons < 1){
      examData.zeroPersonFrames += 1;
      if(examData.zeroPersonFrames%10==0){
        examData.noPersonFlagged+=1;
        examData.zeroPersonFrames=0;
      }
    }
    else if(persons==1){
      examData.zeroPersonFrames=0;
    }
    if (persons > 1){
      examData.morePersonFrames+=1;
      if(examData.morePersonFrames%10==0){
        examData.noOfPersonFlagged+=1;
        examData.morePersonFrames=0;
      }
    }
    else if(persons==1){
      examData.morePersonFrames=0;
    }
  }

  exams.set(examId, examData);
  user.set(userId, exams);
}

export function getExamScore(userId: any, examId: any) {
  const uid = String(userId ?? "");
  const eid = String(examId ?? "");

  console.log("User Map:,",user);



  if (!uid || !eid) {
    console.log("uid or eid is empty",uid,eid);
    return null;
  }
  const exams = user.get(uid);
  if (!exams) {
    console.log("Exam is empty",exams);
    return null;
  }
  return exams.get(eid) ?? null;
}

export function deleteExamScore(userId: any, examId: any) {
  const uid = String(userId ?? "");
  if (!uid) return false;
  const exams = user.get(uid);
  if (!exams) return false;

  if (examId == null) {
    user.delete(uid);
    return true;
  }

  const eid = String(examId);
  const deleted = exams.delete(eid);
  if (exams.size === 0) user.delete(uid);
  return deleted;
}

export const calculateExamScore = async (score: any) => {
  const {
    noOfPersonFlagged,
    noPersonFlagged,
    authFaceFlagged,
    headPositionFlagged,
    eyesFlagged,
    objectDetectedFlagged,
    totalImagesProcessed,
    soundFlagged,
  } = score;

  const totalFlagged =
    (noOfPersonFlagged || 0) +
    (noPersonFlagged || 0) +
    (authFaceFlagged || 0) +
    (headPositionFlagged || 0) +
    (eyesFlagged || 0) +
    (objectDetectedFlagged || 0);

  const totalFrames = Math.max(totalImagesProcessed || 1, 1);

  const violationRates = {
    noOfPersonRate: ((noOfPersonFlagged || 0) / totalFrames) * 100,
    noPersonRate: ((noPersonFlagged || 0) / totalFrames) * 100,
    authFaceRate: ((authFaceFlagged || 0) / totalFrames) * 100,
    headPositionRate: ((headPositionFlagged || 0) / totalFrames) * 100,
    eyesRate: ((eyesFlagged || 0) / totalFrames) * 100,
    objectDetectedRate: ((objectDetectedFlagged || 0) / totalFrames) * 100,
  };

  const weights = {
    no_of_person_flagged: 0.5,
    no_person_flagged: 0.7,
    auth_face_flagged: 1.0,
    head_position_flagged: 0.2,
    eyes_flagged: 0.1,
    object_detected_flagged: 0.7, 
  };

  const weightedScore =
    violationRates.noOfPersonRate * weights.no_of_person_flagged +
    violationRates.noPersonRate * weights.no_person_flagged +
    violationRates.authFaceRate * weights.auth_face_flagged +
    violationRates.headPositionRate * weights.head_position_flagged +
    violationRates.eyesRate * weights.eyes_flagged +
    violationRates.objectDetectedRate * weights.object_detected_flagged;

  let cheatingPercentage;
  
  if (weightedScore === 0) {
    cheatingPercentage = 0;
  } else if (weightedScore <= 10) {
    // For very low scores (0-10%)
    cheatingPercentage = (weightedScore / 5) * 10;
  } else if (weightedScore <= 20) {
    // For moderate scores (10-30%)
    cheatingPercentage = 10 + ((weightedScore - 5) / 10) * 20;
  } else if (weightedScore <= 40) {
    // For higher scores (30-60%)
    cheatingPercentage = 30 + ((weightedScore - 15) / 20) * 30;
  } else if (weightedScore <= 60) {
    // For very high scores (60-85%)
    cheatingPercentage = 60 + ((weightedScore - 35) / 25) * 25;
  } else {
    // Cap at 95% for extreme cases
    cheatingPercentage = Math.min(85 + ((weightedScore - 60) / 40) * 10, 95);
  }

  return {
    totalFlagged,
    weightedScore,
    cheatingPercentage: Math.round(cheatingPercentage * 100) / 100, // Round to 2 decimal places
    severity: getSeverityLevel(cheatingPercentage),
    breakdown: {
      no_of_person_flagged: noOfPersonFlagged || 0,
      no_person_flagged: noPersonFlagged || 0,
      auth_face_flagged: authFaceFlagged || 0,
      head_position_flagged: headPositionFlagged || 0,
      eyes_flagged: eyesFlagged || 0,
      object_detected_flagged: objectDetectedFlagged || 0,
      total_images_processed: totalImagesProcessed || 0,
    },
  };
};


function getSeverityLevel(percentage: number): string {
  if (percentage <= 15) return "Low Risk";
  if (percentage <= 35) return "Moderate Risk";
  if (percentage <= 60) return "High Risk";
  return "Critical Risk";
}