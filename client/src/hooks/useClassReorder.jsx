import { arrayMove } from "@dnd-kit/sortable";
import { reorderSubset } from "../utils/reorder";

export default function useClassReorder({ classes, onClassesReorder }) {
  const handleSectionDragEnd = (sectionIds) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sectionIds.indexOf(active.id);
    const newIndex = sectionIds.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedSection = arrayMove(sectionIds, oldIndex, newIndex);
    const fullIds = classes.map((cls) => String(cls.id));
    const nextOrder = reorderSubset(fullIds, reorderedSection);
    if (onClassesReorder) {
      onClassesReorder(nextOrder);
    }
  };

  return { handleSectionDragEnd };
}
