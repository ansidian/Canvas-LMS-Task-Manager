import { Divider, Stack, Text } from "@mantine/core";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import useClassReorder from "../../hooks/useClassReorder";
import SortableClassRow from "./SortableClassRow";
import {
  ClassRowDeleteConfirm,
  ClassRowEdit,
  ClassRowView,
  NewClassRow,
  UnassignedRow,
} from "./SettingsClassRows";

function ClassListSection({
  title,
  classes,
  config,
  handlers,
  onDragEnd,
  sensors,
  showSyncToggle,
}) {
  if (classes.length === 0) return null;

  const ids = classes.map((cls) => String(cls.id));

  return (
    <>
      <Divider label={title} labelPosition="left" />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd(ids)}
      >
        <SortableContext
          items={ids}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap="xs">
            {classes.map((cls) => (
              <SortableClassRow
                key={cls.id}
                id={String(cls.id)}
                disabled={config.editingClassId === cls.id}
              >
                {config.editingClassId === cls.id ? (
                  <ClassRowEdit config={config} handlers={handlers} />
                ) : config.deleteClassId === cls.id ? (
                  <ClassRowDeleteConfirm
                    cls={cls}
                    config={config}
                    handlers={handlers}
                  />
                ) : (
                  <ClassRowView
                    cls={cls}
                    handlers={handlers}
                    showSyncToggle={showSyncToggle}
                  />
                )}
              </SortableClassRow>
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
    </>
  );
}

export default function SettingsClassesTab({ config, handlers }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );
  const { handleSectionDragEnd } = useClassReorder({
    classes: config.classes,
    onClassesReorder: handlers.onClassesReorder,
  });

  const canvasClasses = config.classes.filter((cls) => cls.canvas_course_id);
  const customClasses = config.classes.filter((cls) => !cls.canvas_course_id);

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Manage your classes. Each class has a color that will be shown on
        calendar events.
      </Text>

      <NewClassRow config={config} handlers={handlers} />

      <Stack gap="xs">
        <UnassignedRow config={config} handlers={handlers} />

        <ClassListSection
          title="From Canvas"
          classes={canvasClasses}
          config={config}
          handlers={handlers}
          onDragEnd={handleSectionDragEnd}
          sensors={sensors}
          showSyncToggle
        />

        <ClassListSection
          title="Custom"
          classes={customClasses}
          config={config}
          handlers={handlers}
          onDragEnd={handleSectionDragEnd}
          sensors={sensors}
          showSyncToggle={false}
        />

        {config.classes.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No classes yet. Add one above.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
