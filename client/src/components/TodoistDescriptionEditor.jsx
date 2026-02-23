import { useEffect, useMemo, useRef } from "react";
import { Box, ActionIcon, Tooltip } from "@mantine/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconLink,
  IconLinkOff,
  IconH1,
  IconH2,
  IconList,
  IconListNumbers,
  IconBlockquote,
} from "@tabler/icons-react";

/**
 * Convert Tiptap HTML to Todoist-compatible markdown.
 */
function htmlToMarkdown(html) {
  if (!html || html === "<p></p>") return "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  function walkChildren(node) {
    return Array.from(node.childNodes).map(walk).join("");
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    const inner = () => walkChildren(node);

    switch (tag) {
      case "strong":
      case "b":
        return `**${inner()}**`;
      case "em":
      case "i":
        return `*${inner()}*`;
      case "s":
      case "del":
        return `~~${inner()}~~`;
      case "code":
        return `\`${inner()}\``;
      case "a": {
        const href = node.getAttribute("href") || "";
        const text = inner();
        return text === href ? href : `[${text}](${href})`;
      }
      case "p":
        return inner() + "\n";
      case "br":
        return "\n";
      case "h1":
        return `# ${inner()}\n`;
      case "h2":
        return `## ${inner()}\n`;
      case "h3":
        return `### ${inner()}\n`;
      case "blockquote":
        return inner()
          .split("\n")
          .filter((l) => l !== "")
          .map((l) => `> ${l}`)
          .join("\n") + "\n";
      case "ul":
        return walkList(node, "- ") + "\n";
      case "ol":
        return walkOl(node) + "\n";
      case "li":
        return inner().replace(/\n$/, "");
      default:
        return inner();
    }
  }

  function walkList(ulNode, prefix) {
    return Array.from(ulNode.children)
      .map((li) => `${prefix}${walk(li)}`)
      .join("\n");
  }

  function walkOl(olNode) {
    return Array.from(olNode.children)
      .map((li, i) => `${i + 1}. ${walk(li)}`)
      .join("\n");
  }

  return Array.from(doc.body.childNodes).map(walk).join("").trim();
}

/**
 * Convert markdown back to HTML for editor initialization.
 */
function markdownToHtml(md) {
  if (!md) return "";

  const lines = md.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("## ")) {
      result.push(`<h2>${inlineToHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      result.push(`<h1>${inlineToHtml(line.slice(2))}</h1>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      result.push(
        `<blockquote>${quoteLines.map((l) => `<p>${inlineToHtml(l)}</p>`).join("")}</blockquote>`,
      );
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      result.push(
        `<ul>${items.map((item) => `<li><p>${inlineToHtml(item)}</p></li>`).join("")}</ul>`,
      );
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s/);
    if (olMatch) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      result.push(
        `<ol>${items.map((item) => `<li><p>${inlineToHtml(item)}</p></li>`).join("")}</ol>`,
      );
      continue;
    }

    // Regular paragraph
    result.push(`<p>${line ? inlineToHtml(line) : "<br>"}</p>`);
    i++;
  }

  return result.join("");
}

function inlineToHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

const ICON_SIZE = 15;

function ToolbarButton({ icon: Icon, active, onClick, label }) {
  return (
    <Tooltip label={label} position="top" withArrow openDelay={400}>
      <ActionIcon
        size="xs"
        variant={active ? "filled" : "subtle"}
        color={active ? "blue" : "gray"}
        onClick={onClick}
        style={{ width: 26, height: 26 }}
      >
        <Icon size={ICON_SIZE} stroke={2} />
      </ActionIcon>
    </Tooltip>
  );
}

function Divider() {
  return (
    <Box
      style={{
        width: 1,
        alignSelf: "stretch",
        margin: "2px 4px",
        background: "var(--mantine-color-default-border)",
      }}
    />
  );
}

function BubbleToolbar({ editor, onLink }) {
  // Subscribe to editor transactions so active states refresh on every change
  const editorState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      link: e.isActive("link"),
    }),
  });

  return (
    <div className="todoist-desc-bubble-menu">
      <ToolbarButton
        icon={IconBold}
        active={editorState.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      />
      <ToolbarButton
        icon={IconItalic}
        active={editorState.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      />
      <ToolbarButton
        icon={IconStrikethrough}
        active={editorState.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      />
      <ToolbarButton
        icon={IconCode}
        active={editorState.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
        label="Code"
      />
      <Divider />
      <ToolbarButton
        icon={IconH1}
        active={editorState.h1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        label="Heading 1"
      />
      <ToolbarButton
        icon={IconH2}
        active={editorState.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      />
      <Divider />
      <ToolbarButton
        icon={IconList}
        active={editorState.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      />
      <ToolbarButton
        icon={IconListNumbers}
        active={editorState.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      />
      <ToolbarButton
        icon={IconBlockquote}
        active={editorState.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Quote"
      />
      <Divider />
      <ToolbarButton
        icon={editorState.link ? IconLinkOff : IconLink}
        active={editorState.link}
        onClick={onLink}
        label={editorState.link ? "Remove link" : "Add link"}
      />
    </div>
  );
}

export default function TodoistDescriptionEditor({
  value,
  onChange,
  placeholder = "Add a description...",
  minRows = 2,
  maxRows = 5,
}) {
  const suppressChangeRef = useRef(false);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "todoist-desc-link" },
      }),
    ],
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: markdownToHtml(value),
    immediatelyRender: false,
    onUpdate({ editor: e, transaction }) {
      if (suppressChangeRef.current) return;
      if (!transaction?.docChanged) return;
      const html = e.getHTML();
      const md = htmlToMarkdown(html);
      onChange(md);
    },
    editorProps: {
      attributes: {
        style: `min-height:${minRows * 22}px; max-height:${maxRows * 22}px;`,
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentMd = htmlToMarkdown(editor.getHTML());
    if (currentMd !== (value || "")) {
      suppressChangeRef.current = true;
      editor.commands.setContent(markdownToHtml(value), false);
      suppressChangeRef.current = false;
    }
  }, [editor, value]);

  const handleLink = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const url = window.prompt("URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <Box>
      <style>{`
        .todoist-desc-editor .ProseMirror {
          min-height: ${minRows * 22}px;
          max-height: ${maxRows * 22}px;
          overflow-y: auto;
          outline: none;
          font-size: 13px;
          line-height: 1.5;
        }
        .todoist-desc-editor .ProseMirror p {
          margin: 0 0 2px 0;
        }
        .todoist-desc-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--mantine-color-dimmed);
          pointer-events: none;
          height: 0;
        }
        .todoist-desc-editor .ProseMirror strong { font-weight: 700; }
        .todoist-desc-editor .ProseMirror em { font-style: italic; }
        .todoist-desc-editor .ProseMirror s { text-decoration: line-through; }
        .todoist-desc-editor .ProseMirror code {
          background: var(--mantine-color-gray-1, #f1f3f5);
          padding: 1px 4px;
          border-radius: 3px;
          font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
          font-size: 0.9em;
        }
        [data-mantine-color-scheme="dark"] .todoist-desc-editor .ProseMirror code {
          background: var(--mantine-color-dark-5, #373A40);
        }
        .todoist-desc-editor .ProseMirror h1 {
          font-size: 1.3em;
          font-weight: 700;
          margin: 8px 0 4px;
          line-height: 1.3;
        }
        .todoist-desc-editor .ProseMirror h2 {
          font-size: 1.1em;
          font-weight: 700;
          margin: 6px 0 3px;
          line-height: 1.3;
        }
        .todoist-desc-editor .ProseMirror ul,
        .todoist-desc-editor .ProseMirror ol {
          padding-left: 20px;
          margin: 4px 0;
        }
        .todoist-desc-editor .ProseMirror ul { list-style-type: disc; }
        .todoist-desc-editor .ProseMirror ol { list-style-type: decimal; }
        .todoist-desc-editor .ProseMirror li { margin: 1px 0; }
        .todoist-desc-editor .ProseMirror li p { margin: 0; }
        .todoist-desc-editor .ProseMirror blockquote {
          border-left: 3px solid var(--mantine-color-default-border);
          margin: 4px 0;
          padding: 2px 0 2px 12px;
          color: var(--mantine-color-dimmed);
        }
        .todoist-desc-editor .ProseMirror blockquote p {
          margin: 0;
        }
        .todoist-desc-editor .todoist-desc-link {
          color: var(--mantine-color-blue-6, #228be6);
          text-decoration: underline;
          cursor: pointer;
        }
        .todoist-desc-bubble-menu {
          display: flex;
          gap: 2px;
          padding: 4px 6px;
          background: var(--mantine-color-body);
          border: 1px solid var(--mantine-color-default-border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
      `}</style>
      <Box
        className="todoist-desc-editor"
        style={{
          borderRadius: 8,
          border: "1px solid var(--mantine-color-default-border)",
          padding: "8px 10px",
          backgroundColor: "var(--mantine-color-body)",
        }}
      >
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ duration: 150, placement: "top" }}
          >
            <BubbleToolbar editor={editor} onLink={handleLink} />
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
