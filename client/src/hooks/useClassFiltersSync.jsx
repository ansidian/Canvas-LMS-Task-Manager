import { useEffect } from "react";
import { getStorageItem, getStorageJSON, setStorageJSON } from "../utils/storage";

const SEEN_CLASSES_KEY = "calendar_seen_classes";
const CLASS_FILTERS_KEY = "calendar_class_filters";

export default function useClassFiltersSync({ classes, setClassFilters }) {
	useEffect(() => {
		if (classes.length > 0) {
			const allClassIds = classes.map((cls) => String(cls.id));
			const hasLocalStorageKey =
				getStorageItem(CLASS_FILTERS_KEY) !== null;

			if (!hasLocalStorageKey) {
        setClassFilters([...allClassIds, "unassigned"]);
        setStorageJSON(SEEN_CLASSES_KEY, allClassIds);
      } else {
        const seenClasses = getStorageJSON(SEEN_CLASSES_KEY, []);
        const genuinelyNewClassIds = allClassIds.filter(
          (id) => !seenClasses.includes(id),
        );

        if (genuinelyNewClassIds.length > 0) {
          setClassFilters((prev) => {
            const next = [...prev, ...genuinelyNewClassIds];
            return next;
          });
          setStorageJSON(SEEN_CLASSES_KEY, allClassIds);
        }
      }
		}
	}, [classes, setClassFilters]);
}
