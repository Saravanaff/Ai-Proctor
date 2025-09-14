import { useEffect } from "react";
import { useParticipantData } from "./useParticipantData";
import { useScore } from "./useScore";
import { useViolationLogs } from "./useViolationLogs";
import { useVideoManager } from "./useVideoManager";

export const useParticipantDetails = () => {
  const participantData = useParticipantData();
  const score = useScore();
  const violationLogs = useViolationLogs();
  const videoManager = useVideoManager({
    userId: participantData.user?.id || null,
    examId: participantData.examDetails?.id || null,
    examStartTime: participantData.examStartTime,
  });

  // Fetch score when user and exam details are available
  useEffect(() => {
    if (participantData.user && participantData.examDetails) {
      score.fetchScore({
        userId: participantData.user.id,
        examId: participantData.examDetails.id,
      });
    }
  }, [participantData.user, participantData.examDetails, score.fetchScore]);

  // Fetch violation logs when exam details are available
  useEffect(() => {
    if (participantData.examDetails && participantData.user) {
      violationLogs.fetchLogs(
        participantData.examDetails.id,
        participantData.user.id.toString()
      );
    }
  }, [participantData.examDetails, participantData.user, violationLogs.fetchLogs]);

  return {
    // Participant data
    user: participantData.user,
    examDetails: participantData.examDetails,
    attendance: participantData.attendance,
    examStartTime: participantData.examStartTime,
    participantLoading: participantData.loading,
    participantError: participantData.error,

    // Score data
    scoreDetails: score.scoreDetails,
    scoreLoading: score.loading,
    scoreError: score.error,

    // Violation logs
    violations: violationLogs.violations,
    timelineEvents: violationLogs.timelineEvents,
    violationsLoading: violationLogs.loading,
    violationsError: violationLogs.error,

    // Video management
    ...videoManager,

    // Combined loading state
    loading: participantData.loading || score.loading || violationLogs.loading,
  };
};