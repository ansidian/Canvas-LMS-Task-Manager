import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

const MAX_SUGGESTIONS = 6;

const MentionList = forwardRef(({ items, command }, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		setSelectedIndex(0);
	}, [items]);

	const selectItem = (index) => {
		const item = items[index];
		if (!item) return;
		command({ id: item.id, label: item.label });
	};

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }) => {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setSelectedIndex((prev) =>
					prev + 1 < items.length ? prev + 1 : 0,
				);
				return true;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedIndex((prev) =>
					prev - 1 >= 0 ? prev - 1 : items.length - 1,
				);
				return true;
			}
			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				selectItem(selectedIndex);
				return true;
			}
			return false;
		},
	}));

	return (
		<Box className="notes-mention-list">
			<Stack gap={2}>
				{items.map((item, index) => (
					<Box
						key={item.id}
						className={`notes-mention-item${index === selectedIndex ? " is-active" : ""}`}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => selectItem(index)}
						style={{
							padding: "6px 8px",
							borderRadius: 6,
							cursor: "pointer",
						}}
					>
						<Group gap="xs" wrap="nowrap">
							<Box
								style={{
									width: 10,
									height: 10,
									backgroundColor: item.classColor,
									borderRadius: 2,
									flexShrink: 0,
								}}
							/>
							<Stack gap={0}>
								<Text size="sm">{item.label}</Text>
								<Text size="xs" c="dimmed">
									{item.className}
								</Text>
							</Stack>
						</Group>
					</Box>
				))}
			</Stack>
		</Box>
	);
});

MentionList.displayName = "MentionList";

export default function NotesTextarea({
	label,
	placeholder,
	value,
	onChange,
	onUserEdit,
	events = [],
	classes = [],
	unassignedColor = "#a78b71",
	currentEventId = null,
	onOpenEvent,
	minRows = 3,
	maxRows = 14,
}) {
	const [activeMarks, setActiveMarks] = useState({ bold: false, italic: false });
	const classById = useMemo(() => {
		const map = new Map();
		classes.forEach((cls) => {
			map.set(String(cls.id), cls);
		});
		return map;
	}, [classes]);
	const eventsById = useMemo(() => {
		const map = new Map();
		events.forEach((event) => {
			map.set(String(event.id), event);
		});
		return map;
	}, [events]);
	const wasFocusedOnMouseDownRef = useRef(false);
	const isCurrentEvent = (event) =>
		currentEventId != null && String(event?.id) === String(currentEventId);

	const buildMentionItem = (event) => {
		const cls = classById.get(String(event.class_id));
		return {
			id: String(event.id),
			label: event.title,
			className: cls?.name || "Unassigned",
			classColor: cls?.color || unassignedColor,
		};
	};

	const suggestion = useMemo(
		() => ({
			items: ({ query }) => {
				const lower = query.toLowerCase();
				return events
					.filter((event) => {
						if (!event?.title) return false;
						if (isCurrentEvent(event)) return false;
						return lower
							? event.title.toLowerCase().includes(lower)
							: event.title;
					})
					.slice(0, MAX_SUGGESTIONS)
					.map(buildMentionItem);
			},
			render: () => {
				let component;
				let popup;

				return {
					onStart: (props) => {
						if (!props.clientRect) return;
						component = new ReactRenderer(MentionList, {
							props,
							editor: props.editor,
						});
						popup = tippy("body", {
							getReferenceClientRect: props.clientRect,
							appendTo: () => document.body,
							content: component.element,
							showOnCreate: true,
							interactive: true,
							trigger: "manual",
							placement: "top-start",
							theme: "ctm",
							arrow: false,
						});
					},
					onUpdate(props) {
						if (!popup) return;
						component.updateProps(props);
						if (!props.clientRect) return;
						popup[0].setProps({
							getReferenceClientRect: props.clientRect,
						});
					},
					onKeyDown(props) {
						if (!popup) return false;
						if (props.event.key === "Escape") {
							popup[0].hide();
							return true;
						}
						return component.ref?.onKeyDown(props);
					},
					onExit() {
						if (popup) {
							popup[0].destroy();
						}
						if (component) {
							component.destroy();
						}
					},
				};
			},
		}),
		[events, classById, unassignedColor, currentEventId],
	);

	const extensions = useMemo(
		() => [
			StarterKit.configure({
				// Disable Link since we add our own configured version
				link: false,
			}),
			Placeholder.configure({ placeholder }),
			TaskList,
			TaskItem.configure({
				nested: true,
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "notes-link",
				},
			}),
			Mention.configure({
				HTMLAttributes: {
					class: "ctm-mention",
				},
				suggestion,
				renderHTML({ node, HTMLAttributes = {} }) {
					const mentionStyle = [
						"display:inline-block",
						"padding:2px 6px",
						"border-radius:999px",
						"background:var(--mantine-color-grape-light, rgba(190, 75, 219, 0.15))",
						"color:var(--mantine-color-grape-8, #9c36b5)",
						"font-weight:600",
						"text-decoration:none",
						"cursor:pointer",
						"transition:transform 150ms ease, background-color 150ms ease, color 150ms ease, box-shadow 150ms ease",
					].join(";");
					return [
						"span",
						{
							...HTMLAttributes,
							"data-type": "mention",
							"data-id": node.attrs.id,
							"data-label": node.attrs.label,
							"data-mention-id": node.attrs.id,
							role: "button",
							tabindex: "0",
							style: HTMLAttributes.style
								? `${HTMLAttributes.style};${mentionStyle}`
								: mentionStyle,
						},
						`@${node.attrs.label}`,
					];
				},
			}),
		],
		[placeholder, suggestion],
	);

	const editor = useEditor({
		extensions,
		content: value || "",
		immediatelyRender: false,
		onUpdate({ editor: editorInstance, transaction }) {
			if (!transaction?.docChanged) return;
			// Don't use isEmpty - it returns true for empty lists/structures
			// Check if there's only an empty paragraph
			const html = editorInstance.getHTML();
			const isActuallyEmpty = html === "<p></p>" || html === "";
			onChange(isActuallyEmpty ? "" : html);
			if (onUserEdit && editorInstance.isFocused) {
				onUserEdit();
			}
		},
		editorProps: {
			attributes: {
				style: `min-height:${minRows * 24}px; max-height:${maxRows * 24}px;`,
			},
			handleKeyDown: (view, event) => {
				// Mod+Enter - prevent newline, let parent handle save
				if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
					// Don't preventDefault - let the event bubble to the modal's save handler
					// Just return true to prevent TipTap from inserting a newline
					return true;
				}
				// Mod+K for links
				if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
					event.preventDefault();
					const { from, to } = view.state.selection;
					const hasSelection = from !== to;

					if (view.state.schema.marks.link) {
						const isActive = view.state.doc
							.rangeHasMark(from, to, view.state.schema.marks.link);

						if (isActive) {
							// Remove link
							const tr = view.state.tr.removeMark(
								from,
								to,
								view.state.schema.marks.link,
							);
							view.dispatch(tr);
						} else if (hasSelection) {
							// Prompt for URL and add link
							const url = window.prompt("Enter URL:");
							if (url) {
								const mark = view.state.schema.marks.link.create({ href: url });
								const tr = view.state.tr.addMark(from, to, mark);
								view.dispatch(tr);
							}
						}
					}
					return true;
				}
				return false;
			},
		},
	});

	useEffect(() => {
		if (!editor) return;
		const nextContent = value || "";
		if (editor.getHTML() !== nextContent) {
			editor.commands.setContent(nextContent, false);
		}
	}, [editor, value]);

	useEffect(() => {
		if (!editor) return;
		const handleMouseDown = () => {
			wasFocusedOnMouseDownRef.current = editor.isFocused;
		};
		const handleClick = (event) => {
			// Only handle clicks when editor wasn't focused (prevents accidental navigation while editing)
			if (wasFocusedOnMouseDownRef.current) return;

			// Check for mention clicks
			const mentionTarget = event.target.closest(
				"[data-mention-id], [data-type='mention']",
			);
			if (mentionTarget && onOpenEvent) {
				event.preventDefault();
				const mentionId =
					mentionTarget.getAttribute("data-mention-id") ||
					mentionTarget.getAttribute("data-id");
				const match = eventsById.get(String(mentionId));
				if (match) {
					onOpenEvent(match);
					// Blur editor so subsequent clicks also work
					editor.commands.blur();
				}
				return;
			}

			// Check for link clicks
			const linkTarget = event.target.closest("a[href]");
			if (linkTarget) {
				event.preventDefault();
				const href = linkTarget.getAttribute("href");
				if (href) {
					window.open(href, "_blank", "noopener,noreferrer");
					// Blur editor so subsequent link clicks also work
					editor.commands.blur();
				}
			}
		};
		const dom = editor.view.dom;
		dom.addEventListener("mousedown", handleMouseDown);
		dom.addEventListener("click", handleClick);
		return () => {
			dom.removeEventListener("mousedown", handleMouseDown);
			dom.removeEventListener("click", handleClick);
		};
	}, [editor, onOpenEvent, eventsById]);

	// Track active formatting marks for visual feedback
	useEffect(() => {
		if (!editor) return;
		const updateMarks = () => {
			setActiveMarks({
				bold: editor.isActive("bold"),
				italic: editor.isActive("italic"),
			});
		};
		editor.on("selectionUpdate", updateMarks);
		editor.on("transaction", updateMarks);
		return () => {
			editor.off("selectionUpdate", updateMarks);
			editor.off("transaction", updateMarks);
		};
	}, [editor]);

	const hasActiveFormat = activeMarks.bold || activeMarks.italic;

	return (
		<Box>
			<style>{`
				.notes-editor .ProseMirror {
					min-height: ${minRows * 24}px;
					max-height: ${maxRows * 24}px;
					overflow-y: auto;
					outline: none;
				}
				.notes-editor .ProseMirror p.is-editor-empty:first-child::before {
					content: attr(data-placeholder);
					float: left;
					color: var(--mantine-color-dimmed);
					pointer-events: none;
					height: 0;
				}
				/* Text formatting styles */
				.notes-editor .ProseMirror strong {
					font-weight: 700;
				}
				.notes-editor .ProseMirror em {
					font-style: italic;
				}
				.notes-editor .ProseMirror code {
					background: var(--mantine-color-gray-1, #f1f3f5);
					padding: 2px 4px;
					border-radius: 4px;
					font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
					font-size: 0.9em;
				}
				[data-mantine-color-scheme="dark"] .notes-editor .ProseMirror code {
					background: var(--mantine-color-dark-5, #373A40);
				}
				/* List styles */
				.notes-editor .ProseMirror ul,
				.notes-editor .ProseMirror ol {
					padding-left: 24px;
					margin: 4px 0;
				}
				.notes-editor .ProseMirror ul {
					list-style-type: disc;
				}
				.notes-editor .ProseMirror ol {
					list-style-type: decimal;
				}
				.notes-editor .ProseMirror li {
					margin: 2px 0;
				}
				.notes-editor .ProseMirror li p {
					margin: 0;
				}
				/* Task list / checkbox styles */
				.notes-editor .ProseMirror ul[data-type="taskList"] {
					list-style: none;
					padding-left: 0;
					margin: 4px 0;
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li {
					display: flex;
					align-items: flex-start;
					gap: 8px;
					margin: 4px 0;
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li > label {
					flex-shrink: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					width: 18px;
					height: 18px;
					margin-top: 3px;
					cursor: pointer;
					user-select: none;
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
					appearance: none;
					-webkit-appearance: none;
					width: 16px;
					height: 16px;
					border: 1.5px solid var(--mantine-color-default-border);
					border-radius: 4px;
					background: var(--mantine-color-body);
					cursor: pointer;
					transition: all 150ms ease;
					position: relative;
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:hover {
					border-color: var(--mantine-color-primary-6, var(--mantine-primary-color-6));
					background: var(--mantine-color-primary-light, rgba(34, 139, 230, 0.1));
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
					background: var(--mantine-color-primary-6, var(--mantine-primary-color-6));
					border-color: var(--mantine-color-primary-6, var(--mantine-primary-color-6));
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
					content: '';
					position: absolute;
					left: 4.5px;
					top: 1.5px;
					width: 4px;
					height: 8px;
					border: solid white;
					border-width: 0 2px 2px 0;
					transform: rotate(45deg);
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li > div {
					flex: 1;
					min-width: 0;
				}
				.notes-editor .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
					text-decoration: line-through;
					color: var(--mantine-color-dimmed);
				}
				/* Link styles */
				.notes-editor .ProseMirror a,
				.notes-editor .notes-link {
					color: var(--mantine-color-blue-6, #228be6);
					text-decoration: underline;
					text-decoration-color: var(--mantine-color-blue-3, #74c0fc);
					text-underline-offset: 2px;
					cursor: pointer;
					transition: color 150ms ease, text-decoration-color 150ms ease;
				}
				.notes-editor .ProseMirror a:hover,
				.notes-editor .notes-link:hover {
					color: var(--mantine-color-blue-7, #1c7ed6);
					text-decoration-color: var(--mantine-color-blue-6, #228be6);
				}
				.notes-editor .ctm-mention,
				.notes-editor [data-mention-id] {
					display: inline-block;
					padding: 2px 6px;
					border-radius: 999px;
					background: var(--mantine-color-grape-light, rgba(190, 75, 219, 0.15));
					color: var(--mantine-color-grape-8, #9c36b5);
					font-weight: 600;
					text-decoration: none;
					cursor: pointer !important;
					transition:
						transform 150ms ease,
						background-color 150ms ease,
						color 150ms ease,
						box-shadow 150ms ease;
				}
				.notes-editor .ctm-mention:hover,
				.notes-editor .ctm-mention:focus-visible,
				.notes-editor [data-mention-id]:hover,
				.notes-editor [data-mention-id]:focus-visible {
					background: var(--mantine-color-grape-light, rgba(190, 75, 219, 0.25)) !important;
					color: var(--mantine-color-grape-9, #862e9c) !important;
					text-decoration: underline;
					box-shadow: 0 1px 4px rgba(134, 46, 156, 0.25) !important;
					transform: translateY(-1px);
				}
				.notes-mention-list {
					background: var(--mantine-color-body);
					border: 1px solid var(--mantine-color-default-border);
					border-radius: 8px;
					padding: 6px;
					color: var(--mantine-color-text);
				}
				.tippy-box[data-theme~="ctm"] {
					background: transparent;
					box-shadow: none;
				}
				.tippy-box[data-theme~="ctm"] .tippy-content {
					padding: 0;
					background: transparent;
				}
				.notes-mention-item {
					color: var(--mantine-color-text);
				}
				[data-mantine-color-scheme="light"] .notes-mention-item:hover,
				[data-mantine-color-scheme="light"] .notes-mention-item.is-active {
					background-color: var(--mantine-color-gray-1);
				}
				[data-mantine-color-scheme="dark"] .notes-mention-item:hover,
				[data-mantine-color-scheme="dark"] .notes-mention-item.is-active {
					background-color: var(--mantine-color-dark-6);
				}
			`}</style>
			<Text size="sm" fw={500} mb={4}>
				{label}
			</Text>
			<Box
				className="notes-editor"
				style={{
					borderRadius: 8,
					border: "1px solid var(--mantine-color-default-border)",
					padding: "8px 10px",
					backgroundColor: "var(--mantine-color-body)",
					position: "relative",
				}}
			>
				<EditorContent editor={editor} />
				{hasActiveFormat && (
					<Group
						gap={4}
						style={{
							position: "absolute",
							bottom: 4,
							right: 6,
							pointerEvents: "none",
						}}
					>
						{activeMarks.bold && (
							<Text
								size="xs"
								fw={700}
								style={{
									padding: "1px 5px",
									borderRadius: 4,
									background: "var(--mantine-color-blue-light)",
									color: "var(--mantine-color-blue-7)",
									fontSize: 10,
									lineHeight: 1.4,
								}}
							>
								B
							</Text>
						)}
						{activeMarks.italic && (
							<Text
								size="xs"
								fs="italic"
								style={{
									padding: "1px 5px",
									borderRadius: 4,
									background: "var(--mantine-color-grape-light)",
									color: "var(--mantine-color-grape-7)",
									fontSize: 10,
									lineHeight: 1.4,
								}}
							>
								I
							</Text>
						)}
					</Group>
				)}
			</Box>
		</Box>
	);
}
