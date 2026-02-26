import { useEffect, useState } from "react";

export default function useSettingsModalState({
	opened,
	highlightCredentials,
	onHighlightClear,
}) {
	const [canvasUrl, setCanvasUrl] = useState("");
	const [canvasToken, setCanvasToken] = useState("");
	const [todoistToken, setTodoistToken] = useState("");
	const [discordWebhook, setDiscordWebhook] = useState("");
	const [savedDiscordWebhook, setSavedDiscordWebhook] = useState(""); // tracks server-persisted value
	const [discordSaveSuccess, setDiscordSaveSuccess] = useState(false);
	const [newClassName, setNewClassName] = useState("");
	const [newClassColor, setNewClassColor] = useState("#228be6");
	const [editingClassId, setEditingClassId] = useState(null);
	const [editName, setEditName] = useState("");
	const [editColor, setEditColor] = useState("");
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [todoistSaveSuccess, setTodoistSaveSuccess] = useState(false);
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
		todoistToken,
		setTodoistToken,
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
		todoistSaveSuccess,
		setTodoistSaveSuccess,
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
		discordWebhook,
		setDiscordWebhook,
		savedDiscordWebhook,
		setSavedDiscordWebhook,
		discordSaveSuccess,
		setDiscordSaveSuccess,
	};
}
