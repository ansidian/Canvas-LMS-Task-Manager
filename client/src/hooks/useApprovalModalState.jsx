import { useState } from "react";

export default function useApprovalModalState() {
	const [formData, setFormData] = useState({
		dueDate: null,
		classId: null,
		eventType: "assignment",
		notes: "",
		url: "",
		canvas_due_date_override: 0,
	});
	const [exitDirection, setExitDirection] = useState(null);
	const [showDescriptionFullscreen, setShowDescriptionFullscreen] =
		useState(false);
	const [eventTypePulse, setEventTypePulse] = useState(false);
	const [shakeCount, setShakeCount] = useState(0);
	const [hasUserEdited, setHasUserEdited] = useState(false);

	return {
		formData,
		setFormData,
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
