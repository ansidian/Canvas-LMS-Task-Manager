import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Box, Stack, Group, Text } from "@mantine/core";
import { IconFolder, IconTag } from "@tabler/icons-react";
import { todoistColor } from "../utils/todoist-colors";

const MAX_SUGGESTIONS = 6;

/**
 * Inline autocomplete popover for Todoist quick-add input.
 * Detects # (project) and @ (label) triggers in the text input,
 * shows a filtered dropdown, and inserts the selected value.
 *
 * Renders via portal to escape overflow clipping on parent containers.
 */
export default function TodoistAutocomplete({
  inputRef,
  value,
  onValueChange,
  projects = [],
  labels = [],
  active = false,
}) {
  const [trigger, setTrigger] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popoverPos, setPopoverPos] = useState(null);
  const popoverRef = useRef(null);
  const prevTriggerKey = useRef(null);

  const getInput = useCallback(() => {
    const el = inputRef?.current;
    if (!el) return null;
    if (el.tagName === "INPUT") return el;
    return el.querySelector?.("input") || null;
  }, [inputRef]);

  const updatePosition = useCallback(() => {
    const input = getInput();
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, [getInput]);

  const detectTrigger = useCallback(() => {
    const input = getInput();
    if (!input || !active) {
      setTrigger(null);
      return;
    }

    const cursorPos = input.selectionStart;
    const textBefore = value.slice(0, cursorPos);

    for (let i = textBefore.length - 1; i >= 0; i--) {
      const ch = textBefore[i];
      if (ch === " " && i < textBefore.length - 1) break;

      if (ch === "#" || ch === "@") {
        if (i > 0 && textBefore[i - 1] !== " ") break;
        const query = textBefore.slice(i + 1);
        if (query.includes(" ") && !query.startsWith('"')) break;

        const type = ch === "#" ? "project" : "label";
        const key = `${type}:${i}`;
        setTrigger({ type, startIdx: i, query });
        if (prevTriggerKey.current !== key) {
          setSelectedIndex(0);
          prevTriggerKey.current = key;
        }
        updatePosition();
        return;
      }
    }

    setTrigger(null);
    prevTriggerKey.current = null;
  }, [getInput, value, active, updatePosition]);

  useEffect(() => { detectTrigger(); }, [value, detectTrigger]);

  useEffect(() => {
    const input = getInput();
    if (!input || !active) return;
    const handler = (e) => {
      if (e.type === "keyup" && ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) return;
      requestAnimationFrame(detectTrigger);
    };
    input.addEventListener("click", handler);
    input.addEventListener("keyup", handler);
    return () => {
      input.removeEventListener("click", handler);
      input.removeEventListener("keyup", handler);
    };
  }, [getInput, active, detectTrigger]);

  const suggestions = trigger
    ? (() => {
        const query = trigger.query.toLowerCase().replace(/^"/, "");
        const items =
          trigger.type === "project"
            ? projects.map((p) => ({ id: p.id, name: p.name, color: p.color }))
            : labels.map((l) => ({ id: l.id || l.name, name: l.name, color: l.color }));
        return items
          .filter((item) => !query || item.name.toLowerCase().includes(query))
          .slice(0, MAX_SUGGESTIONS);
      })()
    : [];

  // Clamp selectedIndex when filtered list shrinks
  useEffect(() => {
    if (selectedIndex >= suggestions.length && suggestions.length > 0) {
      setSelectedIndex(suggestions.length - 1);
    }
  }, [suggestions.length, selectedIndex]);

  const insertSuggestion = useCallback(
    (item) => {
      if (!trigger) return;
      const input = getInput();
      const prefix = trigger.type === "project" ? "#" : "@";
      const token = item.name.includes(" ")
        ? `${prefix}"${item.name}" `
        : `${prefix}${item.name} `;
      const before = value.slice(0, trigger.startIdx);
      const after = value.slice(input?.selectionStart ?? trigger.startIdx + trigger.query.length + 1);
      onValueChange(before + token + after);
      setTrigger(null);
      requestAnimationFrame(() => {
        if (input) {
          const newPos = before.length + token.length;
          input.setSelectionRange(newPos, newPos);
          input.focus();
        }
      });
    },
    [trigger, value, onValueChange, getInput],
  );

  useEffect(() => {
    if (!trigger || suggestions.length === 0) return;
    const input = getInput();
    if (!input) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          insertSuggestion(suggestions[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        setTrigger(null);
      }
    };
    input.addEventListener("keydown", handleKeyDown);
    return () => input.removeEventListener("keydown", handleKeyDown);
  }, [trigger, suggestions, selectedIndex, insertSuggestion, getInput]);

  if (!trigger || suggestions.length === 0 || !popoverPos) return null;

  const isProject = trigger.type === "project";

  return createPortal(
    <Box
      ref={popoverRef}
      style={{
        position: "fixed",
        top: popoverPos.top,
        left: popoverPos.left,
        width: popoverPos.width,
        zIndex: 1000,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 10,
        padding: "6px 4px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.20), 0 2px 6px rgba(0,0,0,0.10)",
      }}
    >
      <Group gap={6} px={8} py={4}>
        {isProject
          ? <IconFolder size={12} style={{ color: "var(--graphite)" }} />
          : <IconTag size={12} style={{ color: "var(--graphite)" }} />
        }
        <Text size="xs" c="dimmed" fw={600} style={{ letterSpacing: "0.04em" }}>
          {isProject ? "Projects" : "Labels"}
        </Text>
      </Group>
      <Stack gap={1}>
        {suggestions.map((item, index) => (
          <Box
            key={item.id}
            onMouseDown={(e) => {
              e.preventDefault();
              insertSuggestion(item);
            }}
            style={{
              padding: "7px 10px",
              borderRadius: 6,
              cursor: "pointer",
              background:
                index === selectedIndex
                  ? "var(--card-hover)"
                  : "transparent",
              transition: "background 80ms ease",
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Group gap={10} wrap="nowrap">
              {isProject ? (
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: todoistColor(item.color) || "var(--graphite)",
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: todoistColor(item.color) || "var(--graphite)",
                    borderRadius: "50%",
                    flexShrink: 0,
                    opacity: todoistColor(item.color) ? 1 : 0.5,
                  }}
                />
              )}
              <Text size="sm" style={{ color: "var(--ink)" }}>{item.name}</Text>
            </Group>
          </Box>
        ))}
      </Stack>
    </Box>,
    document.body,
  );
}
