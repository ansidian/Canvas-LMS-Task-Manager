import {
  Anchor,
  Box,
  Button,
  FileInput,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import dayjs from "dayjs";

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
      <Text size="sm" fw={500} mb={4}>
        Canvas Submission
      </Text>
      {(assignmentLoading || submissionLoading) && (
        <Box style={{ width: "100%", maxWidth: 408 }}>
          <Stack gap="xs">
            <Skeleton height={20} radius="sm" />
            <Skeleton height={61} radius="sm" />
            <Skeleton height={17} radius="sm" />
            <Skeleton height={81} radius="sm" />
            <Skeleton height={34} radius="sm" />
            <Skeleton height={17} radius="sm" />
            <Skeleton height={17} radius="sm" />
          </Stack>
        </Box>
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
              {dayjs(submissionInfo.submitted_at).format("MMM D, YYYY h:mm A")}
            </Text>
          )}
          {assignmentInfo?.quiz_id && (
            <Text size="sm" c="dimmed">
              This looks like a quiz. {openInCanvasLink}
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
              onChange={(value) => onSubmissionTypeChange(value || "")}
              data={submissionOptions}
              disabled={isCanvasLocked}
            />
          )}
          {submissionType === "online_upload" && supportsFileUpload && (
            <>
              <FileInput
                label="Upload file(s)"
                placeholder="Select file(s)"
                multiple
                clearable
                accept={acceptList}
                disabled={isCanvasLocked}
                value={selectedFiles}
                onChange={onFilesChange}
              />
              {assignmentInfo?.allowed_extensions?.length > 0 && (
                <Text size="xs" c="dimmed">
                  Allowed: {assignmentInfo.allowed_extensions.join(", ")}
                </Text>
              )}
            </>
          )}
          {submissionType === "online_text_entry" && supportsTextEntry && (
            <Textarea
              label="Submission text"
              minRows={4}
              disabled={isCanvasLocked}
              value={submissionBody}
              onChange={(e) => onBodyChange(e.target.value)}
            />
          )}
          {submissionType === "online_url" && supportsUrl && (
            <TextInput
              label="Submission URL"
              placeholder="https://"
              disabled={isCanvasLocked}
              value={submissionUrl}
              onChange={(e) => onUrlChange(e.target.value)}
            />
          )}
          {submissionOptions.length > 0 && (
            <Textarea
              label="Comments..."
              minRows={2}
              maxRows={6}
              autosize
              disabled={isCanvasLocked}
              value={submissionComment}
              onChange={(e) => onCommentChange(e.target.value)}
            />
          )}
          {submissionOptions.length > 0 ? (
            <Button
              onClick={onSubmit}
              loading={isSubmitting}
              disabled={
                isSubmitting ||
                isCanvasLocked ||
                (submissionType === "online_upload" &&
                  selectedFiles.length === 0) ||
                (submissionType === "online_text_entry" &&
                  !submissionBody.trim()) ||
                (submissionType === "online_url" && !submissionUrl.trim())
              }
            >
              {submissionExists ? "Resubmit to Canvas" : "Submit to Canvas"}
            </Button>
          ) : !assignmentInfo?.quiz_id && !isCanvasLocked ? (
            <Text size="sm" c="dimmed">
              This assignment cannot be submitted in CTM. Use {openInCanvasLink}
              .
            </Text>
          ) : null}
          {submissionInfo?.attachments?.length > 0 && (
            <Box>
              <Text size="xs" fw={500}>
                Submitted files
              </Text>
              <Stack gap={2}>
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
          {submissionError && (
            <Text size="sm" c="red">
              {submissionError}
            </Text>
          )}
        </Stack>
      )}
    </Box>
  );
}
