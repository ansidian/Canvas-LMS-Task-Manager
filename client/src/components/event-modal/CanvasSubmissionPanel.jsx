import {
  Anchor,
  Box,
  Button,
  FileInput,
  Group,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconFileText,
  IconLink,
  IconMessage,
  IconPaperclip,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatRelativeTime } from "../../utils/datetime";

// Section wrapper with subtle background
function SubmissionSection({ children, variant = "default" }) {
  const bgColor = variant === "success"
    ? "var(--complete-light)"
    : variant === "warning"
    ? "var(--overdue-light)"
    : "var(--parchment)";

  return (
    <Box
      style={{
        background: bgColor,
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      {children}
    </Box>
  );
}

export default function CanvasSubmissionPanel({
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
}) {
  if (!canvasIds) return null;

  const { selectedFiles, submissionBody, submissionUrl, submissionComment } =
    submissionFields;
  const openInCanvasLink = canvasUrl ? (
    <Anchor
      href={canvasUrl}
      target="_blank"
      rel="noopener noreferrer"
      size="sm"
    >
      Open in Canvas
    </Anchor>
  ) : (
    "Open in Canvas"
  );

  return (
    <Box>
      <Group gap={8} mb="sm">
        <IconUpload size={16} style={{ opacity: 0.6 }} />
        <Text size="sm" fw={600}>
          Canvas Submission
        </Text>
      </Group>

      {(assignmentLoading || submissionLoading) && (
        <SubmissionSection>
          <Stack gap="xs">
            <Skeleton height={20} radius="sm" />
            <Skeleton height={40} radius="sm" />
            <Skeleton height={60} radius="sm" />
            <Skeleton height={36} radius="sm" />
          </Stack>
        </SubmissionSection>
      )}

      {!assignmentLoading && assignmentError && (
        <SubmissionSection variant="warning">
          <Group gap="xs">
            <IconAlertCircle size={16} color="var(--overdue)" />
            <Text size="sm" c="red">
              {assignmentError}
            </Text>
          </Group>
        </SubmissionSection>
      )}

      {!assignmentLoading && !assignmentError && (
        <Stack gap="sm">
          {/* Submission Status */}
          {submissionExists && (
            <SubmissionSection variant="success">
              <Group gap="xs">
                <IconCheck size={16} color="var(--complete)" />
                <Text size="sm" fw={500} c="green">
                  Submitted{" "}
                  {dayjs(submissionInfo.submitted_at).format(
                    "MMM D, YYYY h:mm A",
                  )}
                </Text>
              </Group>
            </SubmissionSection>
          )}

          {/* Quiz Notice */}
          {assignmentInfo?.quiz_id && (
            <SubmissionSection>
              <Text size="sm" c="dimmed">
                This looks like a quiz. {openInCanvasLink}
              </Text>
            </SubmissionSection>
          )}

          {/* Locked Notice */}
          {isCanvasLocked && (
            <SubmissionSection variant="warning">
              <Group gap="xs" wrap="nowrap">
                <IconClock
                  size={16}
                  color="var(--overdue)"
                  style={{ flexShrink: 0 }}
                />
                <Text size="sm" c="red">
                  {assignmentInfo?.unlock_at &&
                  dayjs(assignmentInfo.unlock_at).isAfter(dayjs()) ? (
                    <Tooltip
                      label={formatRelativeTime(assignmentInfo.unlock_at)}
                      withArrow
                    >
                      <span style={{ cursor: "help" }}>
                        {"Assignment opens "}
                        on{" "}
                        {dayjs(assignmentInfo.unlock_at).format(
                          "MMM D, YYYY h:mm A",
                        )}
                      </span>
                    </Tooltip>
                  ) : (
                    "Canvas has locked the assignment, due date passed"
                  )}
                </Text>
              </Group>
            </SubmissionSection>
          )}

          {/* Submission Form */}
          {!assignmentInfo?.quiz_id &&
            !isCanvasLocked &&
            submissionOptions.length > 0 && (
              <SubmissionSection>
                <Stack gap="sm">
                  {submissionOptions.length > 1 && (
                    <Select
                      label={
                        <Text size="xs" fw={600} c="dimmed" mb={2}>
                          Submission type
                        </Text>
                      }
                      value={submissionType}
                      onChange={(value) => onSubmissionTypeChange(value || "")}
                      data={submissionOptions}
                      size="sm"
                    />
                  )}

                  {submissionType === "online_upload" && supportsFileUpload && (
                    <Box>
                      <FileInput
                        label={
                          <Group gap={6} mb={2}>
                            <IconPaperclip size={12} style={{ opacity: 0.5 }} />
                            <Text size="xs" fw={600} c="dimmed">
                              Upload file(s)
                            </Text>
                          </Group>
                        }
                        placeholder="Select file(s)"
                        multiple
                        clearable
                        accept={acceptList}
                        value={selectedFiles}
                        onChange={onFilesChange}
                        size="sm"
                      />
                      {assignmentInfo?.allowed_extensions?.length > 0 && (
                        <Text size="xs" c="dimmed" mt={4}>
                          Allowed:{" "}
                          {assignmentInfo.allowed_extensions.join(", ")}
                        </Text>
                      )}
                    </Box>
                  )}

                  {submissionType === "online_text_entry" &&
                    supportsTextEntry && (
                      <Textarea
                        label={
                          <Group gap={6} mb={2}>
                            <IconFileText size={12} style={{ opacity: 0.5 }} />
                            <Text size="xs" fw={600} c="dimmed">
                              Submission text
                            </Text>
                          </Group>
                        }
                        minRows={3}
                        value={submissionBody}
                        onChange={(e) => onBodyChange(e.target.value)}
                        size="sm"
                      />
                    )}

                  {submissionType === "online_url" && supportsUrl && (
                    <TextInput
                      label={
                        <Group gap={6} mb={2}>
                          <IconLink size={12} style={{ opacity: 0.5 }} />
                          <Text size="xs" fw={600} c="dimmed">
                            Submission URL
                          </Text>
                        </Group>
                      }
                      placeholder="https://"
                      value={submissionUrl}
                      onChange={(e) => onUrlChange(e.target.value)}
                      size="sm"
                    />
                  )}

                  <Textarea
                    label={
                      <Group gap={6} mb={2}>
                        <IconMessage size={12} style={{ opacity: 0.5 }} />
                        <Text size="xs" fw={600} c="dimmed">
                          Comments (optional)
                        </Text>
                      </Group>
                    }
                    placeholder="Add a comment to your submission..."
                    minRows={2}
                    maxRows={4}
                    autosize
                    value={submissionComment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    size="sm"
                  />

                  <Button
                    onClick={onSubmit}
                    loading={isSubmitting}
                    leftSection={<IconUpload size={16} />}
                    disabled={
                      isSubmitting ||
                      (submissionType === "online_upload" &&
                        selectedFiles.length === 0) ||
                      (submissionType === "online_text_entry" &&
                        !submissionBody.trim()) ||
                      (submissionType === "online_url" && !submissionUrl.trim())
                    }
                    size="sm"
                    fullWidth
                  >
                    {submissionExists
                      ? "Resubmit to Canvas"
                      : "Submit to Canvas"}
                  </Button>
                </Stack>
              </SubmissionSection>
            )}

          {/* Cannot Submit Message */}
          {!assignmentInfo?.quiz_id &&
            !isCanvasLocked &&
            submissionOptions.length === 0 && (
              <SubmissionSection>
                <Text size="sm" c="dimmed">
                  This assignment cannot be submitted in CTM.
                </Text>
              </SubmissionSection>
            )}

          {/* Previously Submitted Files */}
          {submissionInfo?.attachments?.length > 0 && (
            <Box>
              <Group gap={6} mb={6}>
                <IconPaperclip size={14} style={{ opacity: 0.5 }} />
                <Text size="xs" fw={600} c="dimmed">
                  Submitted files
                </Text>
              </Group>
              <Stack gap={4}>
                {submissionInfo.attachments.map((file) => (
                  <Anchor
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    size="xs"
                  >
                    {file.display_name || file.filename || file.id}
                  </Anchor>
                ))}
              </Stack>
            </Box>
          )}

          {/* Submission Error */}
          {submissionError && (
            <SubmissionSection variant="warning">
              <Group gap="xs">
                <IconAlertCircle size={16} color="var(--overdue)" />
                <Text size="sm" c="red">
                  {submissionError}
                </Text>
              </Group>
            </SubmissionSection>
          )}
        </Stack>
      )}
    </Box>
  );
}
