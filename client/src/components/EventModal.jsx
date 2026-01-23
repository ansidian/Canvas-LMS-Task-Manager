import { Box, Modal, useMantineColorScheme } from "@mantine/core";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import DescriptionOverlay from "./event-modal/DescriptionOverlay";
import EventDetailsColumn from "./event-modal/EventDetailsColumn";
import EventFormColumn from "./event-modal/EventFormColumn";
import EventModalFooter from "./event-modal/EventModalFooter";
import useEventModalCanvas from "../hooks/useEventModalCanvas";
import useEventModalForm from "../hooks/useEventModalForm";
import useEventModalSubmission from "../hooks/useEventModalSubmission";

export default function EventModal({
  opened,
  onClose,
  event,
  classes,
  events,
  unassignedColor,
  onUpdate,
  onDelete,
  onOpenEvent,
  api,
  isGuest,
}) {
  const { colorScheme } = useMantineColorScheme();
  const { getToken } = useAuth();

  const canvas = useEventModalCanvas({ event, api, onUpdate });

  const form = useEventModalForm({
    event,
    opened,
    onUpdate,
    onDelete,
    onClose,
    onOpenEvent,
    submissionInfo: canvas.submissionInfo,
    descriptionHtml: canvas.descriptionHtml,
  });

  const submission = useEventModalSubmission({
    event,
    canvasIds: canvas.canvasIds,
    assignmentInfo: canvas.assignmentInfo,
    submissionInfo: canvas.submissionInfo,
    setSubmissionInfo: canvas.setSubmissionInfo,
    getToken,
    onUpdate,
    markUserEdited: form.markUserEdited,
    setSubmissionDirty: form.setSubmissionDirty,
    isGuest,
  });

  if (!event) return null;

  const descriptionLayoutId = `description-${event.id}`;
  const hasDescription = Boolean(canvas.descriptionHtml);

  return (
    <>
      <DescriptionOverlay
        opened={form.showDescriptionFullscreen}
        onClose={() => form.setShowDescriptionFullscreen(false)}
        title={event.title}
        descriptionHtml={canvas.descriptionHtml}
        layoutId={descriptionLayoutId}
      />
      <Modal
        opened={opened}
        onClose={form.handleAttemptClose}
        title="Edit Event"
        size="xl"
      >
        <motion.div animate={form.shakeControls}>
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              height: "75vh",
              maxHeight: "650px",
            }}
          >
            <Box
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                gap: 32,
                marginBottom: 16,
              }}
            >
              <EventFormColumn
                formData={form.formData}
                setFormData={form.setFormData}
                classes={classes}
                event={event}
                unassignedColor={unassignedColor}
                colorScheme={colorScheme}
                showSegmented={form.showSegmented}
                hasDescription={hasDescription}
                descriptionHtml={canvas.descriptionHtml}
                showDescriptionPreview={form.showDescriptionPreview}
                setShowDescriptionPreview={form.setShowDescriptionPreview}
                setShowDescriptionFullscreen={form.setShowDescriptionFullscreen}
                showDescriptionFullscreen={form.showDescriptionFullscreen}
                previewScale={form.previewScale}
                previewContentRef={form.previewContentRef}
                descriptionLayoutId={descriptionLayoutId}
                markUserEdited={form.markUserEdited}
              />

              <EventDetailsColumn
                canvasIds={canvas.canvasIds}
                canvasUrl={event.url}
                assignmentInfo={canvas.assignmentInfo}
                assignmentLoading={canvas.assignmentLoading}
                assignmentError={canvas.assignmentError}
                submissionInfo={canvas.submissionInfo}
                submissionLoading={canvas.submissionLoading}
                submissionOptions={canvas.submissionOptions}
                submissionType={submission.submissionType}
                submissionExists={canvas.submissionExists}
                isCanvasLocked={canvas.isCanvasLocked}
                supportsFileUpload={canvas.supportsFileUpload}
                supportsTextEntry={canvas.supportsTextEntry}
                supportsUrl={canvas.supportsUrl}
                acceptList={canvas.acceptList}
                submissionFields={{
                  selectedFiles: submission.selectedFiles,
                  submissionBody: submission.submissionBody,
                  submissionUrl: submission.submissionUrl,
                  submissionComment: submission.submissionComment,
                }}
                onSubmissionTypeChange={submission.setSubmissionType}
                onFilesChange={submission.setSelectedFiles}
                onBodyChange={submission.setSubmissionBody}
                onUrlChange={submission.setSubmissionUrl}
                onCommentChange={submission.setSubmissionComment}
                onSubmit={submission.handleCanvasSubmission}
                isSubmitting={submission.isSubmitting}
                submissionError={submission.submissionError}
                notesValue={form.formData.notes}
                onNotesChange={(nextValue) => {
                  form.setFormData((prev) => ({
                    ...prev,
                    notes: nextValue,
                  }));
                }}
                onUserEdit={form.markUserEdited}
                events={events}
                classes={classes}
                unassignedColor={unassignedColor}
                currentEventId={event.id}
                onOpenEvent={form.handleOpenMentionEvent}
              />
            </Box>

            <EventModalFooter
              confirmDelete={form.confirmDelete}
              saveSuccess={form.saveSuccess}
              onDelete={form.handleDelete}
              onDiscard={form.handleDiscard}
              onSubmit={form.handleSubmit}
            />
          </Box>
        </motion.div>
      </Modal>
    </>
  );
}
