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
	useMantineColorScheme,
	TypographyStylesProvider,
	Portal,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
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

export default function EventModal({
	opened,
	onClose,
	event,
	classes,
	onUpdate,
	onDelete,
}) {
	const { colorScheme } = useMantineColorScheme();
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
