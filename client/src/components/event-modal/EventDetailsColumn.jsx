import { Badge, Box, Group, Skeleton, Stack, Text } from "@mantine/core";
import { IconFolder, IconHash, IconFlag, IconFileDescription } from "@tabler/icons-react";
import NotesTextarea from "../NotesTextarea";
import CanvasSubmissionPanel from "./CanvasSubmissionPanel";
import { PRIORITY_COLORS } from "./constants";

// Todoist API priority is inverted: 1=normal, 4=urgent.
// User-facing: P1=urgent(4), P2=high(3), P3=medium(2), P4=normal(1).
const userPriority = (apiPriority) => 5 - apiPriority;

function TodoistSectionCard({ children }) {
  return (
    <Box
      style={{
        background: "var(--parchment)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      {children}
    </Box>
  );
}

function TodoistDetailPanel({ detail, loading }) {
  const p = detail ? userPriority(detail.priority) : 4;

  return (
    <Stack gap="md">
      {/* Project */}
      <TodoistSectionCard>
        <Group gap={6} mb={6}>
          <IconFolder size={14} style={{ opacity: 0.5 }} />
          <Text size="sm" fw={600} c="dimmed">
            Project
          </Text>
        </Group>
        {loading ? (
          <Skeleton height={16} width={100} radius={4} />
        ) : detail?.project ? (
          <Group gap={8}>
            <Box
              style={{
                width: 10,
                height: 10,
                backgroundColor: detail.project.color || "#9a9a9a",
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
            <Text size="sm" fw={500}>
              {detail.project.name}
            </Text>
          </Group>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">None</Text>
        )}
      </TodoistSectionCard>

      {/* Labels */}
      <TodoistSectionCard>
        <Group gap={6} mb={6}>
          <IconHash size={14} style={{ opacity: 0.5 }} />
          <Text size="sm" fw={600} c="dimmed">
            Labels
          </Text>
        </Group>
        {loading ? (
          <Skeleton height={22} width={140} radius={4} />
        ) : detail?.labels?.length > 0 ? (
          <Group gap={6}>
            {detail.labels.map((label) => (
              <Badge
                key={label.name}
                size="sm"
                variant="light"
                styles={
                  label.color
                    ? {
                        root: {
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                          borderColor: `${label.color}40`,
                        },
                      }
                    : undefined
                }
              >
                {label.name}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">None</Text>
        )}
      </TodoistSectionCard>

      {/* Priority */}
      <TodoistSectionCard>
        <Group gap={6} mb={6}>
          <IconFlag size={14} style={{ opacity: 0.5 }} />
          <Text size="sm" fw={600} c="dimmed">
            Priority
          </Text>
        </Group>
        {loading ? (
          <Skeleton height={16} width={30} radius={4} />
        ) : (
          <Text size="sm" fw={600} style={{ color: PRIORITY_COLORS[p] }}>
            P{p}
          </Text>
        )}
      </TodoistSectionCard>

      {/* Description */}
      <TodoistSectionCard>
        <Group gap={6} mb={6}>
          <IconFileDescription size={14} style={{ opacity: 0.5 }} />
          <Text size="sm" fw={600} c="dimmed">
            Description
          </Text>
        </Group>
        {loading ? (
          <Skeleton height={16} width={180} radius={4} />
        ) : detail?.description ? (
          <Text
            size="sm"
            style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}
          >
            {detail.description}
          </Text>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">None</Text>
        )}
      </TodoistSectionCard>
    </Stack>
  );
}

export default function EventDetailsColumn({
  isTodoistLinked,
  todoistDetail,
  todoistLoading,
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
      <Stack gap="md">
        {isTodoistLinked ? (
          <TodoistDetailPanel
            detail={todoistDetail}
            loading={todoistLoading}
          />
        ) : (
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
        )}

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
    </Box>
  );
}
