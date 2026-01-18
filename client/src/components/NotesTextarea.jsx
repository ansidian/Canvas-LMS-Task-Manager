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
	maxRows = 8,
}) {
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

	const editor = useEditor({
		extensions: [
			StarterKit,
			Placeholder.configure({ placeholder }),
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
		content: value || "",
		onUpdate({ editor: editorInstance, transaction }) {
			if (!transaction?.docChanged) return;
			onChange(editorInstance.isEmpty ? "" : editorInstance.getHTML());
			if (onUserEdit && editorInstance.isFocused) {
				onUserEdit();
			}
		},
		editorProps: {
			attributes: {
				style: `min-height:${minRows * 24}px; max-height:${maxRows * 24}px;`,
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
		if (!editor || !onOpenEvent) return;
		const handleMouseDown = () => {
			wasFocusedOnMouseDownRef.current = editor.isFocused;
		};
		const handleClick = (event) => {
			const target = event.target.closest(
				"[data-mention-id], [data-type='mention']",
			);
			if (!target) return;
			event.preventDefault();
			if (wasFocusedOnMouseDownRef.current) return;
			const mentionId =
				target.getAttribute("data-mention-id") ||
				target.getAttribute("data-id");
			const match = eventsById.get(String(mentionId));
			if (match) {
				onOpenEvent(match);
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
				}}
			>
				<EditorContent editor={editor} />
			</Box>
		</Box>
	);
}
