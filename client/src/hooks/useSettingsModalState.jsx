import { useEffect, useState } from "react";

export default function useSettingsModalState({
	opened,
	highlightCredentials,
	onHighlightClear,
}) {
	const [canvasUrl, setCanvasUrl] = useState("");
	const [canvasToken, setCanvasToken] = useState("");
	const [newClassName, setNewClassName] = useState("");
	const [newClassColor, setNewClassColor] = useState("#228be6");
	const [editingClassId, setEditingClassId] = useState(null);
	const [editName, setEditName] = useState("");
	const [editColor, setEditColor] = useState("");
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [editingUnassigned, setEditingUnassigned] = useState(false);
	const [editUnassignedColor, setEditUnassignedColor] = useState("");
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [deleteClassId, setDeleteClassId] = useState(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (highlightCredentials && onHighlightClear) {
			const timer = setTimeout(() => {
				onHighlightClear();
			}, 1200);
			return () => clearTimeout(timer);
		}
	}, [highlightCredentials, onHighlightClear]);

	return {
		canvasUrl,
		setCanvasUrl,
		canvasToken,
		setCanvasToken,
		newClassName,
		setNewClassName,
		newClassColor,
		setNewClassColor,
		editingClassId,
		setEditingClassId,
		editName,
		setEditName,
		editColor,
		setEditColor,
		saveSuccess,
		setSaveSuccess,
		editingUnassigned,
		setEditingUnassigned,
		editUnassignedColor,
		setEditUnassignedColor,
		showResetConfirm,
		setShowResetConfirm,
		resetting,
		setResetting,
		deleteClassId,
		setDeleteClassId,
		deleting,
		setDeleting,
	};
}
