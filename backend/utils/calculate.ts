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
    });
  }

  const examData = exams.get(examId);

  const headPos = data?.head_position ?? data?.headPosition;

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

  if (data?.object_detected === true) {
    examData.objectDetectedFlagged += 1;
  }
  if (
    Array.isArray(data?.objects_detected) &&
    data.objects_detected.length > 0
  ) {
    examData.objectDetectedFlagged += 1;
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
  if (!uid || !eid) return null;
  const exams = user.get(uid);
  if (!exams) return null;
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
    no_of_person_flagged,
    no_person_flagged,
    auth_face_flagged,
    head_position_flagged,
    eyes_flagged,
    object_detected_flagged,
  } = score;

  // Calculate total flagged incidents
  const totalFlagged =
    (no_of_person_flagged || 0) +
    (no_person_flagged || 0) +
    (auth_face_flagged || 0) +
    (head_position_flagged || 0) +
    (eyes_flagged || 0) +
    (object_detected_flagged || 0);

  // Define weights for different types of violations (higher weight = more serious)
  const weights = {
    no_of_person_flagged: 20, // Multiple persons detected
    no_person_flagged: 15, // No person detected
    auth_face_flagged: 25, // Unauthorized face detected
    head_position_flagged: 10, // Head not in proper position
    eyes_flagged: 15, // Eyes not looking at screen
    object_detected_flagged: 20, // Unauthorized objects detected
  };

  // Calculate weighted cheating score
  const weightedScore =
    (no_of_person_flagged || 0) * weights.no_of_person_flagged +
    (no_person_flagged || 0) * weights.no_person_flagged +
    (auth_face_flagged || 0) * weights.auth_face_flagged +
    (head_position_flagged || 0) * weights.head_position_flagged +
    (eyes_flagged || 0) * weights.eyes_flagged +
    (object_detected_flagged || 0) * weights.object_detected_flagged;

  // Calculate cheating percentage (assuming max possible weighted score for normalization)
  // You can adjust the max_threshold based on your requirements
  const maxThreshold = 1000; // Maximum weighted score threshold for 100% cheating
  const cheatingPercentage = Math.min(
    (weightedScore / maxThreshold) * 100,
    100
  );

  return {
    totalFlagged,
    weightedScore,
    cheatingPercentage: Math.round(cheatingPercentage * 100) / 100, // Round to 2 decimal places
    breakdown: {
      no_of_person_flagged: no_of_person_flagged || 0,
      no_person_flagged: no_person_flagged || 0,
      auth_face_flagged: auth_face_flagged || 0,
      head_position_flagged: head_position_flagged || 0,
      eyes_flagged: eyes_flagged || 0,
      object_detected_flagged: object_detected_flagged || 0,
    },
  };
};
