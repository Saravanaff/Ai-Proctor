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
    });
  }

  const examData = exams.get(examId);

  const headPos = data?.head_position ?? data?.headPosition;

  examData.totalImagesProcessed += 1;

  if (typeof headPos === "string" && headPos.toLowerCase() !== "forward") {
    examData.headPositionFlagged += 1;
  }

  const eyes = data?.eyes;
  if (Array.isArray(eyes) && eyes.length) {
    const anyOffCenter = eyes.some(
      (e) => String(e ?? "").toLowerCase() !== "center"
    );
    if (anyOffCenter) examData.eyesFlagged += 1;
  } else if (typeof eyes === "string") {
    if (eyes.toLowerCase() !== "center") examData.eyesFlagged += 1;
  }

  if (data?.object_detected["cell phone"] === true) {
    examData.objectDetectedFlagged += 1;
  }

  if ( data?.auth_face === false) {
    examData.authFaceFlagged += 1;
  }

  const personsRaw =
    data?.no_of_person ?? data?.person_count ?? data?.persons_count;
  const persons = Number(personsRaw);
  if (Number.isFinite(persons)) {
    if (persons < 1) examData.noPersonFlagged += 1;
    if (persons > 1) examData.noOfPersonFlagged += 1;
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
  } = score;

  // Calculate total flagged incidents
  const totalFlagged =
    (noOfPersonFlagged || 0) +
    (noPersonFlagged || 0) +
    (authFaceFlagged || 0) +
    (headPositionFlagged || 0) +
    (eyesFlagged || 0) +
    (objectDetectedFlagged || 0);

  // Get total processed frames (minimum 1 to avoid division by zero)
  const totalFrames = Math.max(totalImagesProcessed || 1, 1);

  // Calculate violation rates (percentage of frames with violations)
  const violationRates = {
    noOfPersonRate: ((noOfPersonFlagged || 0) / totalFrames) * 100,
    noPersonRate: ((noPersonFlagged || 0) / totalFrames) * 100,
    authFaceRate: ((authFaceFlagged || 0) / totalFrames) * 100,
    headPositionRate: ((headPositionFlagged || 0) / totalFrames) * 100,
    eyesRate: ((eyesFlagged || 0) / totalFrames) * 100,
    objectDetectedRate: ((objectDetectedFlagged || 0) / totalFrames) * 100,
  };

  // Define weights for different types of violations (based on severity)
  const weights = {
    no_of_person_flagged: 0.8, // Multiple persons detected
    no_person_flagged: 0.6, // No person detected
    auth_face_flagged: 1.0, // Unauthorized face detected (most serious)
    head_position_flagged: 0.2, // Head not in proper position (least serious)
    eyes_flagged: 0.3, // Eyes not looking at screen
    object_detected_flagged: 0.7, // Unauthorized objects detected
  };

  // Calculate weighted score based on violation rates
  const weightedScore =
    violationRates.noOfPersonRate * weights.no_of_person_flagged +
    violationRates.noPersonRate * weights.no_person_flagged +
    violationRates.authFaceRate * weights.auth_face_flagged +
    violationRates.headPositionRate * weights.head_position_flagged +
    violationRates.eyesRate * weights.eyes_flagged +
    violationRates.objectDetectedRate * weights.object_detected_flagged;

  // Use progressive scaling for cheating percentage
  let cheatingPercentage;
  
  if (weightedScore === 0) {
    cheatingPercentage = 0;
  } else if (weightedScore <= 5) {
    // For very low scores (0-10%)
    cheatingPercentage = (weightedScore / 5) * 10;
  } else if (weightedScore <= 15) {
    // For moderate scores (10-30%)
    cheatingPercentage = 10 + ((weightedScore - 5) / 10) * 20;
  } else if (weightedScore <= 35) {
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