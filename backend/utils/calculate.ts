let user = new Map();

export function addScore(data: any) {
  const userId = String(data?.userId ?? data?.user_id ?? "");
  const examId = String(data?.examId ?? data?.exam_id ?? "");
  if (!userId || !examId) return null;
  console.log("add");
  if (!user.has(userId)) user.set(userId, new Map());

  const exams = user.get(userId);
  console.log(data);

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
      authFrames: 0,
      headFrames: 0,
      eyeFrames: 0,
      objectFrames: 0,
      zeroPersonFrames: 0,
      morePersonFrames: 0,
      violationFrames: {
        faceAuthViolations: [],
        headPositionViolations: [],
        eyePositionViolations: [],
        webDetectViolations: [],
        personViolations: [],
      },
    });
  }

  const examData = exams.get(examId);

  const headPos = data?.head_position ?? data?.headPosition;

  if (data.soundDetected && data.soundDetected === true) {
    examData.soundFlagged += 1;
    exams.set(examId, examData);
    user.set(userId, exams);
    return;
  }

  examData.totalImagesProcessed += 1;

  if (
    typeof headPos === "string" &&
    headPos.toLowerCase() !== "forward" &&
    headPos.toLowerCase() !== "down"
  ) {
    examData.headFrames += 1;
    console.log(examData.headFrames);
    if (examData.headFrames % 20 == 0) {
      examData.headPositionFlagged += 1;

      const dataTimestamp = new Date(data.timestamp);
      const violationTime = new Date(dataTimestamp.getTime());
      examData.violationFrames.headPositionViolations.push({
        timestamp: violationTime,
        frameData: {
          ...data,
          violationType: "head_position_violation",
          detectedAt: dataTimestamp,
          secondsBack: 2,
          headPosition: headPos,
        },
      });

      examData.headFrames = 0;
    }
  } else {
    examData.headFrames = 0;
  }

  const eyes = data?.eyes;
  console.log(eyes, "eyeeeeeeee");
  if (Array.isArray(eyes) && eyes.length) {
    if (
      eyes[0].toLowerCase() !== "center" &&
      eyes[1].toLowerCase() !== "center"
    ) {
      examData.eyeFrames += 1;
      console.log(examData.eyeFrames);
      if (examData.eyeFrames % 20 == 0) {
        examData.eyesFlagged += 1;
        const dataTimestamp = new Date(data.timestamp);
        const violationTime = new Date(dataTimestamp.getTime());
        console.log("Eye violation timestamp:", dataTimestamp.toISOString());
        console.log("violationTime:", violationTime.toISOString());

        examData.violationFrames.eyePositionViolations.push({
          timestamp: violationTime,
          frameData: {
            ...data,
            violationType: "eye_position_violation",
            detectedAt: dataTimestamp,
            secondsBack: 2,
            leftEye: eyes[0],
            rightEye: eyes[1],
          },
        });

        examData.eyeFrames = 0;
      }
    } else {
      examData.eyeFrames = 0;
    }
  }

  if (data.object_detected && data.object_detected["cell phone"] === true) {
    examData.objectFrames += 1;
    if (examData.objectFrames % 5 == 0) {
      examData.objectDetectedFlagged += 1;

      const dataTimestamp = new Date(data.timestamp);
      examData.violationFrames.webDetectViolations.push({
        timestamp: dataTimestamp,
        frameData: {
          ...data,
          violationType: "object_detection_violation",
          detectedAt: dataTimestamp,
          secondsBack: 0,
          mobileDetected: true,
        },
      });

      console.log("object flag and violation stored");
      examData.objectFrames = 0;
    }

    console.log("User Map:,", user);
    console.log(examData.violationFrames.webDetectViolations);
  } else if (
    data.object_detected &&
    data?.object_detected["cell phone"] === false
  ) {
    examData.objectFrames = 0;
  }

  if (data?.auth_face == false) {
    examData.authFrames += 1;
    console.log("hi", examData.authFrames);
    if (examData.authFrames % 30 == 0) {
      examData.authFaceFlagged += 1;

      const dataTimestamp = new Date(data.timestamp);
      const violationTime = new Date(dataTimestamp.getTime() - 3000);
      examData.violationFrames.faceAuthViolations.push({
        timestamp: violationTime,
        frameData: {
          ...data,
          violationType: "face_auth_failed",
          detectedAt: dataTimestamp,
          secondsBack: 3,
          authStatus: false,
        },
      });

      examData.authFrames = 0;
    }
  } else if (data.auth_face && data?.auth_face === true) {
    examData.authFrames = 0;
  }

  const personsRaw = data?.no_of_person;
  const persons = Number(personsRaw);
  if (Number.isFinite(persons)) {
    if (persons < 1) {
      examData.zeroPersonFrames += 1;
      if (examData.zeroPersonFrames % 20 == 0) {
        examData.noPersonFlagged += 1;

        const dataTimestamp = new Date(data.timestamp);
        console.log("No person violation timestamp:", dataTimestamp);
        const violationTime = new Date(dataTimestamp.getTime());
        examData.violationFrames.personViolations.push({
          timestamp: violationTime,
          frameData: {
            ...data,
            violationType: "no_person_detected",
            detectedAt: dataTimestamp,
            secondsBack: 2,
            personCount: persons,
          },
        });

        examData.zeroPersonFrames = 0;
      }
    } else if (persons == 1) {
      examData.zeroPersonFrames = 0;
    }
    if (persons > 1) {
      examData.morePersonFrames += 1;
      if (examData.morePersonFrames % 20 == 0) {
        examData.noOfPersonFlagged += 1;

        const dataTimestamp = new Date(data.timestamp);
        const violationTime = new Date(dataTimestamp.getTime());

        examData.violationFrames.personViolations.push({
          timestamp: violationTime,
          frameData: {
            ...data,
            violationType: "multiple_persons_detected",
            detectedAt: dataTimestamp,
            secondsBack: 2,
            personCount: persons,
          },
        });

        examData.morePersonFrames = 0;
      }
    } else if (persons == 1) {
      examData.morePersonFrames = 0;
    }
  }

  exams.set(examId, examData);
  user.set(userId, exams);
}

export function getExamScore(userId: any, examId: any) {
  const uid = String(userId ?? "");
  const eid = String(examId ?? "");

  console.log("User Map:,", user);

  if (!uid || !eid) {
    console.log("uid or eid is empty", uid, eid);
    return null;
  }
  const exams = user.get(uid);
  if (!exams) {
    console.log("Exam is empty", exams);
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
    violationFrames,
  } = score;

  const totalFlagged =
    (noOfPersonFlagged || 0) +
    (noPersonFlagged || 0) +
    (authFaceFlagged || 0) +
    (headPositionFlagged || 0) +
    (eyesFlagged || 0) +
    (objectDetectedFlagged || 0);

  const totalFrames = Math.max(totalImagesProcessed || 1, 1);

  // Calculate max possible flags based on frame thresholds
  const maxPossibleFlags = {
    headPosition: Math.floor(totalFrames / 20), // Every 20 frames (2 seconds)
    eyes: Math.floor(totalFrames / 20), // Every 20 frames (2 seconds)
    authFace: Math.floor(totalFrames / 30), // Every 30 frames (3 seconds)
    noPerson: Math.floor(totalFrames / 20), // Every 20 frames (2 seconds)
    multiplePerson: Math.floor(totalFrames / 20), // Every 20 frames (2 seconds)
    objectDetected: Math.floor(totalFrames / 5), // Every 5 frames (matching your logic)
  };

  // Calculate violation rates based on maximum possible violations (NOT total frames)
  const violationRates = {
    noOfPersonRate:
      maxPossibleFlags.multiplePerson > 0
        ? ((noOfPersonFlagged || 0) / maxPossibleFlags.multiplePerson) * 100
        : 0,
    noPersonRate:
      maxPossibleFlags.noPerson > 0
        ? ((noPersonFlagged || 0) / maxPossibleFlags.noPerson) * 100
        : 0,
    authFaceRate:
      maxPossibleFlags.authFace > 0
        ? ((authFaceFlagged || 0) / maxPossibleFlags.authFace) * 100
        : 0,
    headPositionRate:
      maxPossibleFlags.headPosition > 0
        ? ((headPositionFlagged || 0) / maxPossibleFlags.headPosition) * 100
        : 0,
    eyesRate:
      maxPossibleFlags.eyes > 0
        ? ((eyesFlagged || 0) / maxPossibleFlags.eyes) * 100
        : 0,
    objectDetectedRate:
      maxPossibleFlags.objectDetected > 0
        ? ((objectDetectedFlagged || 0) / maxPossibleFlags.objectDetected) * 100
        : 0,
  };

  // Strict weights since students are pre-informed
  const weights = {
    no_of_person_flagged: 0.7, // Very high - serious violation
    no_person_flagged: 0.7, // High - leaving exam area
    auth_face_flagged: 1.0, // Highest - identity verification
    head_position_flagged: 0.5, // Moderate-high - should know to look forward
    eyes_flagged: 0.3, // Moderate - should keep eyes on screen
    object_detected_flagged: 1.0, // Highest - prohibited items
  };

  const weightedScore =
    violationRates.noOfPersonRate * weights.no_of_person_flagged +
    violationRates.noPersonRate * weights.no_person_flagged +
    violationRates.authFaceRate * weights.auth_face_flagged +
    violationRates.headPositionRate * weights.head_position_flagged +
    violationRates.eyesRate * weights.eyes_flagged +
    violationRates.objectDetectedRate * weights.object_detected_flagged;

  // More aggressive cheating percentage calculation since students are informed
  let cheatingPercentage;

  if (weightedScore === 0) {
    cheatingPercentage = 0;
  } else if (weightedScore <= 5) {
    // Even small violations should show meaningful percentages: 0-5% → 0-15%
    cheatingPercentage = (weightedScore / 5) * 15;
  } else if (weightedScore <= 15) {
    // Low violations: 5-15% → 15-35%
    cheatingPercentage = 15 + ((weightedScore - 5) / 10) * 20;
  } else if (weightedScore <= 30) {
    // Moderate violations: 15-30% → 35-60%
    cheatingPercentage = 35 + ((weightedScore - 15) / 15) * 25;
  } else if (weightedScore <= 50) {
    // High violations: 30-50% → 60-80%
    cheatingPercentage = 60 + ((weightedScore - 30) / 20) * 20;
  } else {
    // Very high violations: 50%+ → 80-95%
    cheatingPercentage = Math.min(80 + ((weightedScore - 50) / 50) * 15, 95);
  }

  return {
    totalFlagged,
    weightedScore: Math.round(weightedScore * 100) / 100,
    cheatingPercentage: Math.round(cheatingPercentage * 100) / 100,
    severity: getSeverityLevel(cheatingPercentage),
    maxPossibleFlags,
    violationRates,
    breakdown: {
      no_of_person_flagged: noOfPersonFlagged || 0,
      no_person_flagged: noPersonFlagged || 0,
      auth_face_flagged: authFaceFlagged || 0,
      head_position_flagged: headPositionFlagged || 0,
      eyes_flagged: eyesFlagged || 0,
      object_detected_flagged: objectDetectedFlagged || 0,
      total_images_processed: totalImagesProcessed || 0,
    },
    violationFrames: violationFrames || {
      faceAuthViolations: [],
      headPositionViolations: [],
      eyePositionViolations: [],
      webDetectViolations: [],
      personViolations: [],
    },
    totalViolations: {
      faceAuth: (violationFrames?.faceAuthViolations || []).length,
      headPosition: (violationFrames?.headPositionViolations || []).length,
      eyePosition: (violationFrames?.eyePositionViolations || []).length,
      webDetect: (violationFrames?.webDetectViolations || []).length,
      person: (violationFrames?.personViolations || []).length,
    },
  };
};

function getSeverityLevel(percentage: number): string {
  if (percentage <= 10) return "Low Risk"; // 0-10% (very minor violations)
  if (percentage <= 25) return "Moderate Risk"; // 11-25% (some violations)
  if (percentage <= 50) return "High Risk"; // 26-50% (significant violations)
  return "Critical Risk"; // 51%+ (major violations)
}
