import { Box, Group, MultiSelect, Select, SegmentedControl, Skeleton, Stack, Text } from "@mantine/core";
import { IconFolder, IconHash, IconFlag, IconFileDescription } from "@tabler/icons-react";
import NotesTextarea from "../NotesTextarea";
import TodoistDescriptionEditor from "../TodoistDescriptionEditor";
import CanvasSubmissionPanel from "./CanvasSubmissionPanel";
import { PRIORITY_COLORS } from "./constants";
import { todoistColor } from "../../utils/todoist-colors";

// Todoist API priority is inverted: 1=normal, 4=urgent.
// User-facing: P1=urgent(4), P2=high(3), P3=medium(2), P4=normal(1).
const userPriority = (apiPriority) => 5 - apiPriority;
const apiPriority = (userP) => 5 - userP;

// Shared with EventFormColumn — same card, same rhythm
function SectionCard({ children, accent = null }) {
  return (
    <Box
      style={{
        background: "var(--parchment)",
        borderRadius: 8,
        padding: "14px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {accent && (
        <Box
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: accent,
            borderRadius: "8px 0 0 8px",
          }}
        />
      )}
      {children}
    </Box>
  );
}

const PRIORITY_DATA = [
  { value: "1", label: "P1" },
  { value: "2", label: "P2" },
  { value: "3", label: "P3" },
  { value: "4", label: "P4" },
];

function TodoistDetailPanel({ edits, projects, labels, loading, onEditChange, onUserEdit }) {
  if (loading || !edits) {
    return (
      <Stack gap="lg">
        <SectionCard>
          <Skeleton height={14} width={70} radius={4} mb={10} />
          <Skeleton height={36} radius="sm" />
        </SectionCard>
        <SectionCard>
          <Stack gap="md">
            <Box>
              <Skeleton height={14} width={60} radius={4} mb={10} />
              <Skeleton height={36} radius="sm" />
            </Box>
            <Box>
              <Skeleton height={14} width={50} radius={4} mb={10} />
              <Skeleton height={36} radius="sm" />
            </Box>
          </Stack>
        </SectionCard>
        <SectionCard>
          <Skeleton height={14} width={80} radius={4} mb={10} />
          <Skeleton height={60} radius="sm" />
        </SectionCard>
      </Stack>
    );
  }

  const p = userPriority(edits.priority);

  // Resolve project color for accent bar
  const currentProject = projects.find((proj) => proj.id === edits.project_id);
  const projectAccent = currentProject ? todoistColor(currentProject.color) : null;

  const projectData = projects.map((proj) => ({
    value: proj.id,
    label: proj.name,
  }));

  const labelData = labels.map((l) => ({
    value: l.name,
    label: l.name,
    color: todoistColor(l.color),
  }));

  return (
    <Stack gap="lg">
      {/* Project — own card with accent bar like Class in EventFormColumn */}
      <SectionCard accent={projectAccent}>
        <Select
          label={
            <Group gap={6} mb={2}>
              <IconFolder size={14} style={{ opacity: 0.5 }} />
              <Text size="sm" fw={600} c="dimmed">
                Project
              </Text>
            </Group>
          }
          data={projectData}
          value={edits.project_id}
          onChange={(val) => {
            onEditChange({ project_id: val });
            onUserEdit();
          }}
          placeholder="Select project"
          searchable
          allowDeselect={false}
          selectFirstOptionOnChange
          leftSection={
            projectAccent ? (
              <Box
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: projectAccent,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
            ) : undefined
          }
          renderOption={({ option }) => {
            const proj = projects.find((p) => p.id === option.value);
            const color = proj ? todoistColor(proj.color) : null;
            return (
              <Group gap="xs" wrap="nowrap">
                <Box
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: color || "#9a9a9a",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text size="sm">{option.label}</Text>
              </Group>
            );
          }}
        />
      </SectionCard>

      {/* Priority & Labels — grouped like Status & Scheduling */}
      <SectionCard>
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={600} mb={6} c="dimmed">
              Priority
            </Text>
            <SegmentedControl
              data={PRIORITY_DATA}
              value={String(p)}
              onChange={(val) => {
                onEditChange({ priority: apiPriority(Number(val)) });
                onUserEdit();
              }}
              fullWidth
              color={PRIORITY_COLORS[p]}
              autoContrast
              styles={{
                root: {
                  backgroundColor: "var(--card)",
                  padding: 3,
                },
                indicator: {
                  boxShadow: "var(--shadow-sm)",
                },
              }}
            />
          </Box>

          <Box>
            <MultiSelect
              label={
                <Group gap={6} mb={2}>
                  <IconHash size={14} style={{ opacity: 0.5 }} />
                  <Text size="sm" fw={600} c="dimmed">
                    Labels
                  </Text>
                </Group>
              }
              data={labelData}
              value={edits.labels}
              onChange={(val) => {
                onEditChange({ labels: val });
                onUserEdit();
              }}
              placeholder={edits.labels.length === 0 ? "Add labels" : undefined}
              searchable
              clearable
              renderOption={({ option }) => {
                const color = labelData.find((l) => l.value === option.value)?.color;
                return (
                  <Group gap="xs" wrap="nowrap">
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: color || "#9a9a9a",
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    />
                    <Text size="sm">{option.label}</Text>
                  </Group>
                );
              }}
            />
          </Box>
        </Stack>
      </SectionCard>

      {/* Description — standalone card */}
      <SectionCard>
        <Group gap={6} mb={4}>
          <IconFileDescription size={14} style={{ opacity: 0.5 }} />
          <Text size="sm" fw={600} c="dimmed">
            Description
          </Text>
        </Group>
        <TodoistDescriptionEditor
          value={edits.description}
          onChange={(md) => {
            onEditChange({ description: md });
            onUserEdit();
          }}
          placeholder="Add a description..."
          maxRows={6}
        />
      </SectionCard>
    </Stack>
  );
}

export default function EventDetailsColumn({
  isTodoistLinked,
  todoistEdits,
  todoistProjects,
  todoistLabels,
  todoistLoading,
  onTodoistEditChange,
  canvasIds,
  canvasUrl,
  assignmentInfo,
  assignmentLoading,
  assignmentError,
  submissionInfo,
  submissionLoading,
  submissionOptions,
  submissionType,
  submissionExists,
  isCanvasLocked,
  supportsFileUpload,
  supportsTextEntry,
  supportsUrl,
  acceptList,
  submissionFields,
  onSubmissionTypeChange,
  onFilesChange,
  onBodyChange,
  onUrlChange,
  onCommentChange,
  onSubmit,
  isSubmitting,
  submissionError,
  notesValue,
  onNotesChange,
  onUserEdit,
  events,
  classes,
  unassignedColor,
  currentEventId,
  onOpenEvent,
}) {
  return (
    <Box
      style={{
        flex: 1,
        overflowY: "auto",
        paddingRight: 4,
      }}
    >
      {isTodoistLinked ? (
        <TodoistDetailPanel
          edits={todoistEdits}
          projects={todoistProjects}
          labels={todoistLabels}
          loading={todoistLoading}
          onEditChange={onTodoistEditChange}
          onUserEdit={onUserEdit}
        />
      ) : (
        <Stack gap="md">
          <CanvasSubmissionPanel
            canvasIds={canvasIds}
            canvasUrl={canvasUrl}
            assignmentInfo={assignmentInfo}
            assignmentLoading={assignmentLoading}
            assignmentError={assignmentError}
            submissionInfo={submissionInfo}
            submissionLoading={submissionLoading}
            submissionOptions={submissionOptions}
            submissionType={submissionType}
            submissionExists={submissionExists}
            isCanvasLocked={isCanvasLocked}
            supportsFileUpload={supportsFileUpload}
            supportsTextEntry={supportsTextEntry}
            supportsUrl={supportsUrl}
            acceptList={acceptList}
            submissionFields={submissionFields}
            onSubmissionTypeChange={onSubmissionTypeChange}
            onFilesChange={onFilesChange}
            onBodyChange={onBodyChange}
            onUrlChange={onUrlChange}
            onCommentChange={onCommentChange}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
          />

          <NotesTextarea
            label="Notes"
            placeholder="Add any notes..."
            value={notesValue}
            onChange={onNotesChange}
            onUserEdit={onUserEdit}
            events={events}
            classes={classes}
            unassignedColor={unassignedColor}
            currentEventId={currentEventId}
            onOpenEvent={onOpenEvent}
          />
        </Stack>
      )}
    </Box>
  );
}
