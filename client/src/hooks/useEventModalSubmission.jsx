import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export default function useEventModalSubmission({
  event,
  canvasIds,
  assignmentInfo,
  submissionInfo,
  setSubmissionInfo,
  getToken,
  onUpdate,
  markUserEdited,
  setSubmissionDirty,
  isGuest,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submissionComment, setSubmissionComment] = useState("");
  const [submissionType, setSubmissionType] = useState("");
  const [submissionBody, setSubmissionBody] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedFiles([]);
    setSubmissionComment("");
    setSubmissionType("");
    setSubmissionBody("");
    setSubmissionUrl("");
    setSubmissionError("");
    setIsSubmitting(false);
    setSubmissionDirty(false);
  }, [event, setSubmissionDirty]);

  useEffect(() => {
    if (!assignmentInfo) return;
    const types = assignmentInfo?.submission_types || [];
    if (types.includes("online_upload")) {
      setSubmissionType("online_upload");
    } else if (types.includes("online_text_entry")) {
      setSubmissionType("online_text_entry");
    } else if (types.includes("online_url")) {
      setSubmissionType("online_url");
    }
  }, [assignmentInfo]);

  const submitCanvasFiles = async (ids, files) => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("courseId", ids.courseId);
    formData.append("assignmentId", ids.assignmentId);
    if (submissionComment.trim()) {
      formData.append("comment", submissionComment.trim());
    }
    files.forEach((file) => {
      formData.append("files", file);
    });
    const res = await fetch("/api/canvas/submissions/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Submission failed" }));
      throw new Error(err.message || "Submission failed");
    }
    return res.json();
  };

  const submitCanvasEntry = async (ids, payload) => {
    const token = await getToken();
    const res = await fetch("/api/canvas/submissions/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseId: ids.courseId,
        assignmentId: ids.assignmentId,
        submissionType: payload.submissionType,
        body: payload.body,
        url: payload.url,
        comment: payload.comment,
      }),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Submission failed" }));
      throw new Error(err.message || "Submission failed");
    }
    return res.json();
  };

  const handleCanvasSubmission = async () => {
    if (!event) return;
    if (isGuest) {
      setSubmissionError("Canvas submissions are not enabled for guests yet.");
      return;
    }
    if (!canvasIds) {
      setSubmissionError("This event is not linked to a Canvas assignment.");
      return;
    }
    if (assignmentInfo?.quiz_id) {
      setSubmissionError("Quizzes must be done on Canvas.");
      return;
    }
    if (assignmentInfo?.locked_for_user) {
      setSubmissionError("Assignment is locked.");
      return;
    }
    if (!submissionType) {
      setSubmissionError("Select a submission type.");
      return;
    }
    if (submissionType === "online_upload" && !selectedFiles.length) {
      setSubmissionError("Select at least one file to submit.");
      return;
    }
    if (submissionType === "online_text_entry" && !submissionBody.trim()) {
      setSubmissionError("Enter text to submit.");
      return;
    }
    if (submissionType === "online_url" && !submissionUrl.trim()) {
      setSubmissionError("Enter a URL to submit.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const result =
        submissionType === "online_upload"
          ? await submitCanvasFiles(canvasIds, selectedFiles)
          : await submitCanvasEntry(canvasIds, {
              submissionType,
              body: submissionBody.trim(),
              url: submissionUrl.trim(),
              comment: submissionComment.trim(),
            });
      const submission = result.submission || {};
      const confirmed =
        submission.workflow_state === "submitted" ||
        Boolean(submission.submitted_at);

      if (!confirmed) {
        setSubmissionError(
          "Canvas did not confirm the submission yet. Try again later.",
        );
        return;
      }

      setSubmissionInfo(submission);
      onUpdate(event.id, { status: "complete" });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#5B8DD9", "#6B9B7A", "#E9B44C", "#9B7BB8"],
        });
      }, 150);
    } catch (err) {
      setSubmissionError(err.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSubmissionField = (setter) => (value) => {
    setter(value);
    setSubmissionDirty(true);
    markUserEdited();
  };

  const updateFiles = (value) => {
    const next = Array.isArray(value) ? value : value ? [value] : [];
    setSelectedFiles(next);
    setSubmissionError("");
    setSubmissionDirty(true);
    markUserEdited();
  };

  return {
    selectedFiles,
    submissionComment,
    submissionType,
    submissionBody,
    submissionUrl,
    submissionError,
    isSubmitting,
    setSubmissionType: updateSubmissionField(setSubmissionType),
    setSubmissionComment: updateSubmissionField(setSubmissionComment),
    setSubmissionBody: updateSubmissionField(setSubmissionBody),
    setSubmissionUrl: updateSubmissionField(setSubmissionUrl),
    setSelectedFiles: updateFiles,
    handleCanvasSubmission,
  };
}
