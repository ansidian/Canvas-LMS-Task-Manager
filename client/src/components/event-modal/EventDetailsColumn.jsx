import { Box, Stack } from "@mantine/core";
import NotesTextarea from "../NotesTextarea";
import CanvasSubmissionPanel from "./CanvasSubmissionPanel";

export default function EventDetailsColumn({
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
    </Box>
  );
}
