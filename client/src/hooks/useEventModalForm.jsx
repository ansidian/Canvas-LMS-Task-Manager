import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useAnimation } from "framer-motion";
import { parseDueDate, toUTCString } from "../utils/datetime";
import { PREVIEW_SIZE } from "../components/event-modal/constants";

export default function useEventModalForm({
  event,
  opened,
  onUpdate,
  onDelete,
  onClose,
  onOpenEvent,
  submissionInfo,
  descriptionHtml,
}) {
  const [formData, setFormData] = useState({
    title: "",
    due_date: null,
    class_id: null,
    event_type: "assignment",
    status: "incomplete",
    notes: "",
    url: "",
    canvas_due_date_override: 0,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSegmented, setShowSegmented] = useState(false);
  const [showDescriptionFullscreen, setShowDescriptionFullscreen] =
    useState(false);
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.25);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [submissionDirty, setSubmissionDirty] = useState(false);
  const previewContentRef = useRef(null);
  const initialFormDataRef = useRef(null);
  const visualStatusAppliedRef = useRef(new Set());
  const shakeControls = useAnimation();

  const markUserEdited = () => {
    setHasUserEdited(true);
  };

  useLayoutEffect(() => {
    if (
      !event ||
      !descriptionHtml ||
      !showDescriptionPreview ||
      !previewContentRef.current
    ) {
      return;
    }
    const contentEl = previewContentRef.current;
    const contentWidth = contentEl.scrollWidth || PREVIEW_SIZE.contentWidth;
    const contentHeight = contentEl.scrollHeight || PREVIEW_SIZE.height;
    const scale = Math.min(
      PREVIEW_SIZE.width / contentWidth,
      PREVIEW_SIZE.height / contentHeight,
      1,
    );
    setPreviewScale(scale);
  }, [event, showDescriptionPreview, descriptionHtml]);

  useEffect(() => {
    if (event) {
      const { date } = parseDueDate(event.due_date);

      const nextFormData = {
        title: event.title,
        due_date: date,
        class_id: event.class_id ? String(event.class_id) : null,
        event_type: event.event_type || "assignment",
        status: event.status || "incomplete",
        notes: event.notes || "",
        url: event.url || "",
        canvas_due_date_override: event.canvas_due_date_override ? 1 : 0,
      };
      setFormData(nextFormData);
      initialFormDataRef.current = nextFormData;
      setHasUserEdited(false);
      setConfirmDelete(false);
      setSaveSuccess(false);
      setShowDescriptionFullscreen(false);
      setSubmissionDirty(false);
    }
  }, [event]);

  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e) => {
      if (e.key !== "Enter") return;

      const target = e.target;
      const isInInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (isInInput) return;

      e.preventDefault();
      handleSubmit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opened, formData]);

  useEffect(() => {
    if (!submissionInfo?.submitted_at) return;
    if (!event?.id) return;
    if (visualStatusAppliedRef.current.has(event.id)) return;
    if (formData.status === "complete") return;
    if (hasUserEdited) return;
    visualStatusAppliedRef.current.add(event.id);
    setFormData((prev) => ({ ...prev, status: "complete" }));
    if (initialFormDataRef.current) {
      initialFormDataRef.current = {
        ...initialFormDataRef.current,
        status: "complete",
      };
    }
  }, [submissionInfo, formData.status, hasUserEdited, event]);

  useEffect(() => {
    if (opened) {
      setShowSegmented(false);
      const timer = setTimeout(() => {
        setShowSegmented(true);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [opened]);

  const handleSubmit = () => {
    const updates = {
      title: formData.title,
      due_date: toUTCString(formData.due_date),
      class_id: formData.class_id ? parseInt(formData.class_id) : null,
      event_type: formData.event_type,
      status: formData.status,
      notes: formData.notes,
      url: formData.url,
      canvas_due_date_override: formData.canvas_due_date_override,
    };

    if (formData.status === "complete" && event.status !== "complete") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"],
      });
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onUpdate(event.id, updates);
    }, 300);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(event.id);
    } else {
      setConfirmDelete(true);
    }
  };

  const hasChanges = useMemo(() => {
    const initial = initialFormDataRef.current;
    if (!initial) return false;
    const sameDueDate =
      initial.due_date === formData.due_date ||
      (initial.due_date instanceof Date &&
        formData.due_date instanceof Date &&
        initial.due_date.getTime() === formData.due_date.getTime());
    return (
      formData.title !== initial.title ||
      !sameDueDate ||
      formData.class_id !== initial.class_id ||
      formData.event_type !== initial.event_type ||
      formData.status !== initial.status ||
      formData.notes !== initial.notes ||
      formData.url !== initial.url ||
      formData.canvas_due_date_override !== initial.canvas_due_date_override ||
      submissionDirty
    );
  }, [formData, submissionDirty]);

  const shouldBlockClose = hasUserEdited && hasChanges;

  const triggerDirtyShake = () => {
    shakeControls.start({
      x: [0, -8, 8, -6, 6, 0],
      transition: { duration: 0.35 },
    });
  };

  const handleAttemptClose = () => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onClose();
  };

  const handleOpenMentionEvent = (eventItem) => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onOpenEvent?.(eventItem);
  };

  const handleDiscard = () => {
    onClose();
  };

  return {
    formData,
    setFormData,
    confirmDelete,
    saveSuccess,
    showSegmented,
    showDescriptionFullscreen,
    setShowDescriptionFullscreen,
    showDescriptionPreview,
    setShowDescriptionPreview,
    previewScale,
    previewContentRef,
    markUserEdited,
    hasUserEdited,
    handleSubmit,
    handleDelete,
    handleAttemptClose,
    handleDiscard,
    handleOpenMentionEvent,
    shakeControls,
    shouldBlockClose,
    submissionDirty,
    setSubmissionDirty,
  };
}
