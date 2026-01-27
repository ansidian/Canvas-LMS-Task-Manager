import { useEffect, useMemo, useRef, useState } from "react";
import { getStorageItem, removeStorageItem, setStorageItem } from "../utils/storage";

const CANVAS_CACHE_TTL_MS = 10 * 60 * 1000;
const CANVAS_CACHE_KEY_PREFIX = "ctm_canvas_cache";

const buildLocalCacheKey = (type, key) =>
  `${CANVAS_CACHE_KEY_PREFIX}:${type}:${key}`;

const readLocalCache = (type, key) => {
  try {
    const raw = getStorageItem(buildLocalCacheKey(type, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp) return null;
    if (Date.now() - parsed.timestamp > CANVAS_CACHE_TTL_MS) {
      removeStorageItem(buildLocalCacheKey(type, key));
      return null;
    }
    return parsed.data || null;
  } catch (err) {
    console.warn("Failed to read Canvas cache:", err);
    return null;
  }
};

const writeLocalCache = (type, key, data) => {
  try {
    setStorageItem(
      buildLocalCacheKey(type, key),
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch (err) {
    console.warn("Failed to write Canvas cache:", err);
  }
};

const parseCanvasIds = (canvasId) => {
  if (!canvasId || typeof canvasId !== "string") return null;
  const [courseId, assignmentId] = canvasId.split("-");
  if (!courseId || !assignmentId) return null;
  return { courseId, assignmentId };
};

export default function useEventModalCanvas({ event, api, onUpdate }) {
  const [assignmentInfo, setAssignmentInfo] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  const autoStatusAppliedRef = useRef(new Set());
  const requestIdRef = useRef(0);

  const canvasIds = useMemo(() => parseCanvasIds(event?.canvas_id), [event]);

  const fetchAssignmentInfo = async (ids, signal) => {
    return api(
      `/canvas/assignment?courseId=${ids.courseId}&assignmentId=${ids.assignmentId}`,
      { signal },
    );
  };

  const fetchSubmissionInfo = async (ids, signal) => {
    return api(
      `/canvas/submissions/self?courseId=${ids.courseId}&assignmentId=${ids.assignmentId}`,
      { signal },
    );
  };

  useEffect(() => {
    setAssignmentInfo(null);
    setAssignmentError("");
    setAssignmentLoading(false);
    setSubmissionInfo(null);
    setSubmissionLoading(false);

    if (!event || !canvasIds) return;

    const cacheKey = `${canvasIds.courseId}-${canvasIds.assignmentId}`;
    const cachedAssignment = readLocalCache("assignment", cacheKey);
    const cachedSubmission = readLocalCache("submission", cacheKey);
    if (cachedAssignment) {
      setAssignmentInfo(cachedAssignment);
    }
    if (cachedSubmission) {
      setSubmissionInfo(cachedSubmission);
    }

    const needsAssignmentRefresh =
      cachedAssignment && typeof cachedAssignment.description === "undefined";

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (!cachedAssignment || needsAssignmentRefresh) {
      setAssignmentLoading(true);
    }
    if (!cachedSubmission) setSubmissionLoading(true);

    if (cachedSubmission?.submitted_at && !autoStatusAppliedRef.current.has(event.id) && !event.canvas_status_override) {
      autoStatusAppliedRef.current.add(event.id);
      onUpdate(event.id, { status: "complete" }, { keepOpen: true });
    }

    if (!cachedAssignment || needsAssignmentRefresh) {
      fetchAssignmentInfo(canvasIds, controller.signal)
        .then((data) => {
          if (requestIdRef.current !== requestId) return;
          setAssignmentInfo(data);
          writeLocalCache("assignment", cacheKey, data);
        })
        .catch((err) => {
          if (
            err?.name === "AbortError" ||
            err?.message?.toLowerCase?.().includes("aborted")
          ) {
            return;
          }
          if (requestIdRef.current !== requestId) return;
          setAssignmentError(err.message || "Failed to load Canvas assignment");
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setAssignmentLoading(false);
        });
    }

    if (!cachedSubmission) {
      fetchSubmissionInfo(canvasIds, controller.signal)
        .then((data) => {
          if (requestIdRef.current !== requestId) return;
          setSubmissionInfo(data);
          writeLocalCache("submission", cacheKey, data);
          if (data?.submitted_at && !autoStatusAppliedRef.current.has(event.id) && !event.canvas_status_override) {
            autoStatusAppliedRef.current.add(event.id);
            onUpdate(event.id, { status: "complete" }, { keepOpen: true });
          }
        })
        .catch((err) => {
          if (
            err?.name === "AbortError" ||
            err?.message?.toLowerCase?.().includes("aborted")
          ) {
            return;
          }
          if (requestIdRef.current !== requestId) return;
          console.warn("Failed to load Canvas submission:", err);
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setSubmissionLoading(false);
        });
    }

    return () => controller.abort();
  }, [event, canvasIds, api, onUpdate]);

  const descriptionHtml =
    event?.description ?? assignmentInfo?.description ?? "";

  const submissionTypes = assignmentInfo?.submission_types || [];
  const supportsFileUpload = submissionTypes.includes("online_upload");
  const supportsTextEntry = submissionTypes.includes("online_text_entry");
  const supportsUrl = submissionTypes.includes("online_url");
  const submissionOptions = [
    supportsFileUpload && { value: "online_upload", label: "File upload" },
    supportsTextEntry && { value: "online_text_entry", label: "Text entry" },
    supportsUrl && { value: "online_url", label: "Website URL" },
  ].filter(Boolean);
  const submissionExists = Boolean(submissionInfo?.submitted_at);
  const isCanvasLocked = Boolean(assignmentInfo?.locked_for_user);
  const acceptList = useMemo(() => {
    const extensions = assignmentInfo?.allowed_extensions;
    if (!Array.isArray(extensions) || extensions.length === 0) return undefined;
    return extensions
      .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`))
      .join(",");
  }, [assignmentInfo]);

  return {
    canvasIds,
    assignmentInfo,
    assignmentLoading,
    assignmentError,
    submissionInfo,
    setSubmissionInfo,
    submissionLoading,
    descriptionHtml,
    submissionOptions,
    submissionExists,
    isCanvasLocked,
    supportsFileUpload,
    supportsTextEntry,
    supportsUrl,
    acceptList,
  };
}
