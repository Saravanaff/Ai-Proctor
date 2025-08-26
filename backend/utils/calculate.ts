let user = new Map();

export function addScore(data:any) {

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
      objectDetectedFlagged: 0
    });
  }

  const examData = exams.get(examId);

  const headPos = (data?.head_position ?? data?.headPosition);


  if (typeof headPos === "string" && headPos.toLowerCase() !== "forward") {
    examData.headPositionFlagged += 1;
  }

  const eyes = data?.eyes;
  if (Array.isArray(eyes) && eyes.length) {
    const anyOffCenter = eyes.some((e) => String(e ?? "").toLowerCase() !== "center");
    if (anyOffCenter) examData.eyesFlagged += 1;
  } 

  else if (typeof eyes === "string") {
    if (eyes.toLowerCase() !== "center") examData.eyesFlagged += 1;
  }
  
  if (data?.object_detected === true) {
    examData.objectDetectedFlagged += 1;
  }
  if (Array.isArray(data?.objects_detected) && data.objects_detected.length > 0) {
    examData.objectDetectedFlagged += 1;
  }

  
  const personsRaw = data?.no_of_person ?? data?.person_count ?? data?.persons_count;
  const persons = Number(personsRaw);
  if (Number.isFinite(persons)) {
    if (persons < 1) examData.noPersonFlagged += 1;
    if (persons > 1) examData.noOfPersonFlagged += 1;
  }

  exams.set(examId, examData);
  user.set(userId, exams);

}

export function getExamScore(userId:any, examId:any) {
  const uid = String(userId ?? "");
  const eid = String(examId ?? "");
  if (!uid || !eid) return null;
  const exams = user.get(uid);
  if (!exams) return null;
  return exams.get(eid) ?? null;
}

export function deleteExamScore(userId:any, examId:any) {
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