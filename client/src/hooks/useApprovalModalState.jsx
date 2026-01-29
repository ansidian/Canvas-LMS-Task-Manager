import { useState, useRef, useMemo, useCallback } from "react";

const DEFAULT_FORM_DATA = {
	dueDate: null,
	classId: null,
	eventType: "assignment",
	notes: "",
	url: "",
	canvas_due_date_override: 0,
};

export default function useApprovalModalState() {
	const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
	const [exitDirection, setExitDirection] = useState(null);
	const [showDescriptionFullscreen, setShowDescriptionFullscreen] =
		useState(false);
	const [eventTypePulse, setEventTypePulse] = useState(false);
	const [shakeCount, setShakeCount] = useState(0);
	const [hasUserEdited, setHasUserEdited] = useState(false);

	// Track initial form data for dirty checking
	const initialFormDataRef = useRef(null);

	// Calculate if form has been modified from initial state
	const isDirty = useMemo(() => {
		const initial = initialFormDataRef.current;
		if (!initial) return false;

		const sameDueDate =
			initial.dueDate === formData.dueDate ||
			(initial.dueDate &&
				formData.dueDate &&
				initial.dueDate.getTime() === formData.dueDate.getTime());

		return (
			formData.classId !== initial.classId ||
			formData.eventType !== initial.eventType ||
			formData.notes !== initial.notes ||
			formData.url !== initial.url ||
			formData.canvas_due_date_override !== initial.canvas_due_date_override ||
			!sameDueDate
		);
	}, [formData]);

	// Set both form data and initial snapshot
	const initializeFormData = useCallback((data) => {
		setFormData(data);
		initialFormDataRef.current = data;
		setHasUserEdited(false);
	}, []);

	// Expose ref for external access (e.g., blocking navigation)
	const isDirtyRef = useRef(false);
	isDirtyRef.current = isDirty;

	return {
		formData,
		setFormData,
		initializeFormData,
		isDirty,
		isDirtyRef,
		exitDirection,
		setExitDirection,
		showDescriptionFullscreen,
		setShowDescriptionFullscreen,
		eventTypePulse,
		setEventTypePulse,
		shakeCount,
		setShakeCount,
		hasUserEdited,
		setHasUserEdited,
	};
}
