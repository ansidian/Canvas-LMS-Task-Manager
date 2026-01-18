import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
	Modal,
	Stack,
	TextInput,
	Select,
	Textarea,
	Button,
	Group,
	Anchor,
	Text,
	Box,
	Badge,
	SegmentedControl,
	Skeleton,
	FileInput,
	useMantineColorScheme,
	TypographyStylesProvider,
	Portal,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import { parseDueDate, toUTCString } from "../utils/datetime";

const EVENT_TYPES = [
	{ value: "assignment", label: "Assignment" },
	{ value: "quiz", label: "Quiz" },
	{ value: "exam", label: "Exam" },
	{ value: "homework", label: "Homework" },
	{ value: "lab", label: "Lab" },
];

const STATUS_COLORS = {
	incomplete: "#94a3b8",
	in_progress: "#7950f2",
	complete: "#40c057",
};

const STATUS_OPTIONS = [
	{ value: "incomplete", label: "Incomplete" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "complete", label: "Complete" },
];

const parseCanvasIds = (canvasId) => {
	if (!canvasId || typeof canvasId !== "string") return null;
	const [courseId, assignmentId] = canvasId.split("-");
	if (!courseId || !assignmentId) return null;
	return { courseId, assignmentId };
};

export default function EventModal({
	opened,
	onClose,
	event,
	classes,
	onUpdate,
	onDelete,
}) {
	const { colorScheme } = useMantineColorScheme();
	const { getToken } = useAuth();
	const [formData, setFormData] = useState({
		title: "",
		due_date: null,
		class_id: null,
		event_type: "assignment",
		status: "incomplete",
		notes: "",
		url: "",
	});
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [showSegmented, setShowSegmented] = useState(false);
	const [showDescriptionFullscreen, setShowDescriptionFullscreen] =
		useState(false);
	const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);
	const [previewScale, setPreviewScale] = useState(0.25);
	const previewContentRef = useRef(null);
	const previewSize = { width: 280, height: 140, contentWidth: 640 };
	const [assignmentInfo, setAssignmentInfo] = useState(null);
	const [assignmentLoading, setAssignmentLoading] = useState(false);
	const [assignmentError, setAssignmentError] = useState("");
	const [submissionInfo, setSubmissionInfo] = useState(null);
	const [submissionLoading, setSubmissionLoading] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [submissionComment, setSubmissionComment] = useState("");
	const [submissionType, setSubmissionType] = useState("");
	const [submissionBody, setSubmissionBody] = useState("");
	const [submissionUrl, setSubmissionUrl] = useState("");
	const [submissionError, setSubmissionError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const getCanvasCredentials = () => {
		const canvasUrl = localStorage.getItem("canvasUrl");
		const canvasToken = localStorage.getItem("canvasToken");
		return { canvasUrl, canvasToken };
	};

	const buildAcceptList = (extensions) => {
		if (!Array.isArray(extensions) || extensions.length === 0)
			return undefined;
		return extensions
			.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`))
			.join(",");
	};

	const fetchAssignmentInfo = async (canvasIds, signal) => {
		const { canvasUrl, canvasToken } = getCanvasCredentials();
		if (!canvasUrl || !canvasToken) {
			throw new Error("Canvas URL or token missing");
		}
		const token = await getToken();
		const res = await fetch(
			`/api/canvas/assignment?courseId=${canvasIds.courseId}&assignmentId=${canvasIds.assignmentId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					"X-Canvas-Url": canvasUrl,
					"X-Canvas-Token": canvasToken,
				},
				signal,
			},
		);
		if (!res.ok) {
			const err = await res
				.json()
				.catch(() => ({ message: "Request failed" }));
			throw new Error(err.message || "Request failed");
		}
		return res.json();
	};

	const fetchSubmissionInfo = async (canvasIds, signal) => {
		const { canvasUrl, canvasToken } = getCanvasCredentials();
		if (!canvasUrl || !canvasToken) {
			throw new Error("Canvas URL or token missing");
		}
		const token = await getToken();
		const res = await fetch(
			`/api/canvas/submissions/self?courseId=${canvasIds.courseId}&assignmentId=${canvasIds.assignmentId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					"X-Canvas-Url": canvasUrl,
					"X-Canvas-Token": canvasToken,
				},
				signal,
			},
		);
		if (!res.ok) {
			const err = await res
				.json()
				.catch(() => ({ message: "Request failed" }));
			throw new Error(err.message || "Request failed");
		}
		return res.json();
	};

	const submitCanvasFiles = async (canvasIds, files) => {
		const { canvasUrl, canvasToken } = getCanvasCredentials();
		if (!canvasUrl || !canvasToken) {
			throw new Error("Canvas URL or token missing");
		}
		const token = await getToken();
		const formData = new FormData();
		formData.append("courseId", canvasIds.courseId);
		formData.append("assignmentId", canvasIds.assignmentId);
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
				"X-Canvas-Url": canvasUrl,
				"X-Canvas-Token": canvasToken,
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

	const submitCanvasEntry = async (canvasIds, payload) => {
		const { canvasUrl, canvasToken } = getCanvasCredentials();
		if (!canvasUrl || !canvasToken) {
			throw new Error("Canvas URL or token missing");
		}
		const token = await getToken();
		const res = await fetch("/api/canvas/submissions/submit", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"X-Canvas-Url": canvasUrl,
				"X-Canvas-Token": canvasToken,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				courseId: canvasIds.courseId,
				assignmentId: canvasIds.assignmentId,
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

	useLayoutEffect(() => {
		if (!event || !showDescriptionPreview || !previewContentRef.current) {
			return;
		}
		const contentEl = previewContentRef.current;
		const contentWidth = contentEl.scrollWidth || previewSize.contentWidth;
		const contentHeight = contentEl.scrollHeight || previewSize.height;
		const scale = Math.min(
			previewSize.width / contentWidth,
			previewSize.height / contentHeight,
			1,
		);
		setPreviewScale(scale);
	}, [
		event,
		showDescriptionPreview,
		previewSize.height,
		previewSize.width,
		previewSize.contentWidth,
	]);

	useEffect(() => {
		setAssignmentInfo(null);
		setAssignmentError("");
		setAssignmentLoading(false);
		setSubmissionInfo(null);
		setSubmissionLoading(false);
		setSelectedFiles([]);
		setSubmissionComment("");
		setSubmissionType("");
		setSubmissionBody("");
		setSubmissionUrl("");
		setSubmissionError("");
		setIsSubmitting(false);

		if (!event) return;

		const canvasIds = parseCanvasIds(event.canvas_id);
		if (!canvasIds) return;

		const controller = new AbortController();
		setAssignmentLoading(true);
		setSubmissionLoading(true);

		fetchAssignmentInfo(canvasIds, controller.signal)
			.then((data) => {
				setAssignmentInfo(data);
				const types = data?.submission_types || [];
				if (types.includes("online_upload")) {
					setSubmissionType("online_upload");
				} else if (types.includes("online_text_entry")) {
					setSubmissionType("online_text_entry");
				} else if (types.includes("online_url")) {
					setSubmissionType("online_url");
				}
			})
			.catch((err) => {
				setAssignmentError(
					err.message || "Failed to load Canvas assignment",
				);
			})
			.finally(() => {
				setAssignmentLoading(false);
			});

		fetchSubmissionInfo(canvasIds, controller.signal)
			.then((data) => {
				setSubmissionInfo(data);
				if (data?.submitted_at && event.status !== "complete") {
					onUpdate(
						event.id,
						{ status: "complete" },
						{ keepOpen: true },
					);
				}
			})
			.catch((err) => {
				console.warn("Failed to load Canvas submission:", err);
			})
			.finally(() => {
				setSubmissionLoading(false);
			});

		return () => controller.abort();
	}, [event]);

	useEffect(() => {
		if (event) {
			// Parse the due_date (handles both date-only and datetime)
			const { date } = parseDueDate(event.due_date);

			setFormData({
				title: event.title,
				due_date: date,
				class_id: event.class_id ? String(event.class_id) : null,
				event_type: event.event_type || "assignment",
				status: event.status || "incomplete",
				notes: event.notes || "",
				url: event.url || "",
			});
			setConfirmDelete(false);
			setSaveSuccess(false);
			setShowDescriptionFullscreen(false);
		}
	}, [event]);

	// Workaround for SegmentedControl rendering issue in modals
	// https://github.com/mantinedev/mantine/issues/8265
	useEffect(() => {
		if (opened) {
			setShowSegmented(false);
			const timer = setTimeout(() => {
				setShowSegmented(true);
			}, 250);
			return () => clearTimeout(timer);
		}
	}, [opened]);

	const handleCanvasSubmission = async () => {
		if (!event) return;
		const canvasIds = parseCanvasIds(event.canvas_id);
		if (!canvasIds) {
			setSubmissionError(
				"This event is not linked to a Canvas assignment.",
			);
			return;
		}
		if (assignmentInfo?.quiz_id) {
			setSubmissionError("Canvas quizzes must be submitted in Canvas.");
			return;
		}
		if (assignmentInfo?.locked_for_user) {
			setSubmissionError("Canvas has locked this assignment.");
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
					colors: ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"],
				});
			}, 150);
		} catch (err) {
			setSubmissionError(err.message || "Submission failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = () => {
		const updates = {
			title: formData.title,
			due_date: toUTCString(formData.due_date),
			class_id: formData.class_id ? parseInt(formData.class_id) : null,
			event_type: formData.event_type,
			status: formData.status,
			notes: formData.notes,
			url: formData.url,
		};
		console.log("[EventModal] Submitting update:", {
			eventId: event.id,
			originalStatus: event.status,
			newStatus: formData.status,
			updates,
		});

		// Celebrate when marking task as complete
		if (formData.status === "complete" && event.status !== "complete") {
			confetti({
				particleCount: 50,
				spread: 60,
				origin: { y: 0.6 },
				colors: ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"],
			});
		}

		// Show success feedback
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

	if (!event) return null;

	const canvasIds = parseCanvasIds(event.canvas_id);
	const submissionTypes = assignmentInfo?.submission_types || [];
	const supportsFileUpload = submissionTypes.includes("online_upload");
	const supportsTextEntry = submissionTypes.includes("online_text_entry");
	const supportsUrl = submissionTypes.includes("online_url");
	const submissionOptions = [
		supportsFileUpload && { value: "online_upload", label: "File upload" },
		supportsTextEntry && {
			value: "online_text_entry",
			label: "Text entry",
		},
		supportsUrl && { value: "online_url", label: "Website URL" },
	].filter(Boolean);
	const submissionExists = Boolean(submissionInfo?.submitted_at);
	const isCanvasLocked = Boolean(assignmentInfo?.locked_for_user);
	const acceptList = buildAcceptList(assignmentInfo?.allowed_extensions);
	const descriptionLayoutId = `description-${event.id}`;

	return (
		<>
			<Portal>
				<AnimatePresence>
					{showDescriptionFullscreen && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							style={{
								position: "fixed",
								inset: 0,
								backgroundColor: "rgba(0, 0, 0, 0.7)",
								zIndex: 210,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								padding: 24,
							}}
							onClick={() => setShowDescriptionFullscreen(false)}
						>
							<motion.div
								layoutId={descriptionLayoutId}
								transition={{
									type: "spring",
									stiffness: 260,
									damping: 22,
								}}
								style={{
									width: "70vw",
									height: "70vh",
									maxWidth: "1100px",
									maxHeight: "80vh",
									backgroundColor:
										"var(--mantine-color-body)",
									borderRadius: 12,
									border: "1px solid var(--mantine-color-default-border)",
									overflow: "hidden",
									boxShadow:
										"0 30px 80px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.25)",
								}}
								onClick={(e) => e.stopPropagation()}
							>
								<Box
									style={{
										padding: 16,
										borderBottom:
											"1px solid var(--mantine-color-default-border)",
									}}
								>
									<Group justify="space-between">
										<Text fw={600}>{event.title}</Text>
										<Button
											size="xs"
											variant="subtle"
											onClick={() =>
												setShowDescriptionFullscreen(
													false,
												)
											}
										>
											Close
										</Button>
									</Group>
								</Box>
								<Box
									style={{
										padding: 16,
										maxHeight: "calc(90vh - 60px)",
										overflowY: "auto",
									}}
								>
									<TypographyStylesProvider>
										<div
											dangerouslySetInnerHTML={{
												__html: event.description,
											}}
										/>
									</TypographyStylesProvider>
								</Box>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</Portal>
			<Modal
				opened={opened}
				onClose={onClose}
				title="Edit Event"
				size="md"
			>
				<Stack>
					<TextInput
						label="Title"
						value={formData.title}
						onChange={(e) =>
							setFormData((f) => ({
								...f,
								title: e.target.value,
							}))
						}
					/>

					<div>
						<Text size="sm" fw={500} mb={4}>
							Status
						</Text>
						{showSegmented ? (
							<SegmentedControl
								fullWidth
								value={formData.status}
								onChange={(v) =>
									setFormData((f) => ({ ...f, status: v }))
								}
								data={STATUS_OPTIONS}
								styles={{
									root: {
										backgroundColor:
											colorScheme === "dark"
												? "var(--mantine-color-dark-6)"
												: "var(--mantine-color-gray-1)",
										padding: 4,
									},
									indicator: {
										backgroundColor:
											STATUS_COLORS[formData.status],
										boxShadow: "none",
									},
									label: {
										"&[data-active]": {
											color: "white",
										},
									},
								}}
							/>
						) : (
							<Skeleton height={36} radius="sm" />
						)}
					</div>

					<DateTimePicker
						label="Due Date & Time"
						placeholder="Pick date and optionally time"
						value={formData.due_date}
						onChange={(v) =>
							setFormData((f) => ({ ...f, due_date: v }))
						}
						firstDayOfWeek={0}
						valueFormat="MMM DD, YYYY hh:mm A"
						presets={[
							{
								value: dayjs()
									.subtract(1, "day")
									.format("YYYY-MM-DD"),
								label: "Yesterday",
							},
							{
								value: dayjs().format("YYYY-MM-DD"),
								label: "Today",
							},
							{
								value: dayjs()
									.add(1, "day")
									.format("YYYY-MM-DD"),
								label: "Tomorrow",
							},
							{
								value: dayjs()
									.add(1, "month")
									.format("YYYY-MM-DD"),
								label: "Next month",
							},
							{
								value: dayjs()
									.add(1, "year")
									.format("YYYY-MM-DD"),
								label: "Next year",
							},
							{
								value: dayjs()
									.subtract(1, "month")
									.format("YYYY-MM-DD"),
								label: "Last month",
							},
						]}
						timePickerProps={{
							popoverProps: { withinPortal: false },
							format: "12h",
						}}
					/>

					<Select
						label="Class"
						placeholder="Select a class"
						data={classes
							.filter(
								(c) =>
									!c.canvas_course_id ||
									c.is_synced ||
									(event && c.id === event.class_id),
							)
							.map((c) => ({
								value: String(c.id),
								label: c.name,
							}))}
						value={formData.class_id}
						onChange={(v) =>
							setFormData((f) => ({ ...f, class_id: v }))
						}
						clearable
						renderOption={({ option }) => {
							const cls = classes.find(
								(c) => String(c.id) === option.value,
							);
							return (
								<Group gap="xs" wrap="nowrap">
									<Box
										style={{
											width: 12,
											height: 12,
											backgroundColor:
												cls?.color || "#a78b71",
											borderRadius: 2,
											flexShrink: 0,
										}}
									/>
									<Text size="sm">{option.label}</Text>
								</Group>
							);
						}}
						leftSection={
							formData.class_id ? (
								<Box
									style={{
										width: 12,
										height: 12,
										backgroundColor:
											classes.find(
												(c) =>
													String(c.id) ===
													formData.class_id,
											)?.color || "#a78b71",
										borderRadius: 2,
										flexShrink: 0,
									}}
								/>
							) : null
						}
					/>

					<Select
						label="Event Type"
						data={EVENT_TYPES}
						value={formData.event_type}
						onChange={(v) =>
							setFormData((f) => ({ ...f, event_type: v }))
						}
					/>

					<TextInput
						label="URL"
						placeholder="Canvas URL"
						value={formData.url}
						onChange={(e) =>
							setFormData((f) => ({ ...f, url: e.target.value }))
						}
					/>

					{formData.url && (
						<Anchor href={formData.url} target="_blank" size="sm">
							Open in Canvas
						</Anchor>
					)}

					{event.points_possible !== null &&
						event.points_possible !== undefined && (
							<Group gap="xs">
								<Text size="sm" fw={500}>
									Points
								</Text>
								<Badge variant="light">
									{event.points_possible}
								</Badge>
							</Group>
						)}

					{canvasIds && (
						<Box>
							<Text size="sm" fw={500} mb={4}>
								Canvas Submission
							</Text>
							{assignmentLoading && (
								<Skeleton height={48} radius="sm" />
							)}
							{submissionLoading && (
								<Skeleton height={32} radius="sm" />
							)}
							{!assignmentLoading && assignmentError && (
								<Text size="sm" c="red">
									{assignmentError}
								</Text>
							)}
							{!assignmentLoading && !assignmentError && (
								<Stack gap="xs">
									{submissionExists && (
										<Text size="sm" c="green">
											Submitted{" "}
											{dayjs(
												submissionInfo.submitted_at,
											).format("MMM D, YYYY h:mm A")}
										</Text>
									)}
									{assignmentInfo?.quiz_id && (
										<Text size="sm" c="dimmed">
											This looks like a quiz. Use Open in
											Canvas.
										</Text>
									)}
									{isCanvasLocked && (
										<Text size="sm" c="red">
											Canvas has locked this assignment.
										</Text>
									)}
									{submissionOptions.length > 1 && (
										<Select
											label="Submission type"
											value={submissionType}
											onChange={(value) =>
												setSubmissionType(value || "")
											}
											data={submissionOptions}
											disabled={isCanvasLocked}
										/>
									)}
									{submissionType === "online_upload" && (
										<>
											<FileInput
												label="Upload file(s)"
												placeholder="Select file(s)"
												multiple
												clearable
												accept={acceptList}
												disabled={isCanvasLocked}
												value={selectedFiles}
												onChange={(value) => {
													const next = Array.isArray(
														value,
													)
														? value
														: value
															? [value]
															: [];
													setSelectedFiles(next);
													setSubmissionError("");
												}}
											/>
											{assignmentInfo?.allowed_extensions
												?.length > 0 && (
												<Text size="xs" c="dimmed">
													Allowed:{" "}
													{assignmentInfo.allowed_extensions.join(
														", ",
													)}
												</Text>
											)}
										</>
									)}
									{submissionType === "online_text_entry" && (
										<Textarea
											label="Submission text"
											minRows={4}
											disabled={isCanvasLocked}
											value={submissionBody}
											onChange={(e) =>
												setSubmissionBody(
													e.target.value,
												)
											}
										/>
									)}
									{submissionType === "online_url" && (
										<TextInput
											label="Submission URL"
											placeholder="https://"
											disabled={isCanvasLocked}
											value={submissionUrl}
											onChange={(e) =>
												setSubmissionUrl(e.target.value)
											}
										/>
									)}
									{submissionOptions.length > 0 && (
										<Textarea
											label="Comments..."
											minRows={2}
											disabled={isCanvasLocked}
											value={submissionComment}
											onChange={(e) =>
												setSubmissionComment(
													e.target.value,
												)
											}
										/>
									)}
									{submissionOptions.length > 0 ? (
										<Button
											onClick={handleCanvasSubmission}
											loading={isSubmitting}
											disabled={
												isSubmitting ||
												isCanvasLocked ||
												(submissionType ===
													"online_upload" &&
													selectedFiles.length ===
														0) ||
												(submissionType ===
													"online_text_entry" &&
													!submissionBody.trim()) ||
												(submissionType ===
													"online_url" &&
													!submissionUrl.trim())
											}
										>
											{submissionExists
												? "Resubmit to Canvas"
												: "Submit to Canvas"}
										</Button>
									) : (
										<Text size="sm" c="dimmed">
											This assignment cannot be submitted
											in CTM. Use Open in Canvas.
										</Text>
									)}
									{submissionInfo?.attachments?.length >
										0 && (
										<Box>
											<Text size="xs" fw={500}>
												Submitted files
											</Text>
											<Stack gap={2}>
												{submissionInfo.attachments.map(
													(file) => (
														<Anchor
															key={file.id}
															href={file.url}
															target="_blank"
															size="xs"
														>
															{file.display_name ||
																file.filename ||
																file.id}
														</Anchor>
													),
												)}
											</Stack>
										</Box>
									)}
									{submissionError && (
										<Text size="sm" c="red">
											{submissionError}
										</Text>
									)}
								</Stack>
							)}
						</Box>
					)}

					{event.description && (
						<Box>
							<Group justify="space-between">
								<Text size="sm" fw={500}>
									Description
								</Text>
								<Box
									style={{ position: "relative" }}
									onMouseEnter={() =>
										setShowDescriptionPreview(true)
									}
									onMouseLeave={() =>
										setShowDescriptionPreview(false)
									}
								>
									<Button
										size="xs"
										variant="light"
										onClick={() => {
											setShowDescriptionPreview(false);
											setShowDescriptionFullscreen(true);
										}}
									>
										View
									</Button>
									<AnimatePresence>
										{showDescriptionPreview &&
											!showDescriptionFullscreen && (
												<motion.div
													layoutId={
														descriptionLayoutId
													}
													initial={{
														opacity: 0,
														y: -6,
													}}
													animate={{
														opacity: 1,
														y: 0,
													}}
													exit={{ opacity: 0, y: -6 }}
													transition={{
														duration: 0.15,
													}}
													style={{
														position: "absolute",
														right: 0,
														top: "110%",
														width: 280,
														height: 140,
														padding: 10,
														borderRadius: 10,
														border: "1px solid var(--mantine-color-default-border)",
														backgroundColor:
															"var(--mantine-color-body)",
														boxShadow:
															"0 12px 28px rgba(0, 0, 0, 0.18)",
														overflow: "hidden",
														zIndex: 5,
													}}
												>
													<TypographyStylesProvider>
														<div
															style={{
																width: previewSize.contentWidth,
																transform: `scale(${previewScale})`,
																transformOrigin:
																	"top left",
																fontSize:
																	"0.95rem",
																lineHeight: 1.4,
															}}
															ref={
																previewContentRef
															}
															dangerouslySetInnerHTML={{
																__html: event.description,
															}}
														/>
													</TypographyStylesProvider>
												</motion.div>
											)}
									</AnimatePresence>
								</Box>
							</Group>
						</Box>
					)}

					<Textarea
						label="Notes"
						placeholder="Add any notes..."
						minRows={3}
						value={formData.notes}
						onChange={(e) =>
							setFormData((f) => ({
								...f,
								notes: e.target.value,
							}))
						}
					/>

					<Group justify="space-between">
						<Button
							color={confirmDelete ? "red" : "gray"}
							variant={confirmDelete ? "filled" : "subtle"}
							onClick={handleDelete}
						>
							{confirmDelete ? "Confirm Delete" : "Delete"}
						</Button>
						<Group>
							<Button variant="subtle" onClick={onClose}>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								color={saveSuccess ? "green" : "blue"}
								className={saveSuccess ? "success-flash" : ""}
							>
								{saveSuccess ? "✓ Saved" : "Save Changes"}
							</Button>
						</Group>
					</Group>
				</Stack>
			</Modal>
		</>
	);
}
