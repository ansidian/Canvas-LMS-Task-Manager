import { useCallback } from "react";

export default function useCanvasClassesSync({ api, loadClasses }) {
	const ensureClassesExist = useCallback(async (canvasCourses, existingClasses) => {
		const existingByCanvasId = new Map();
		const existingByName = new Map();
		for (const cls of existingClasses) {
			if (cls.canvas_course_id) {
				existingByCanvasId.set(cls.canvas_course_id, cls);
			}
			existingByName.set(cls.name.toLowerCase(), cls);
		}

		const colors = [
			"#228be6",
			"#fa5252",
			"#fab005",
			"#15aabf",
			"#e64980",
			"#fd7e14",
			"#20c997",
		];

		let needsReload = false;

		for (const course of canvasCourses) {
			const { canvas_course_id, name } = course;

			if (existingByCanvasId.has(canvas_course_id)) {
				continue;
			}

			const matchingClass = existingByName.get(name.toLowerCase());
			if (matchingClass && !matchingClass.canvas_course_id) {
				try {
					await api(`/classes/${matchingClass.id}`, {
						method: "PATCH",
						body: JSON.stringify({ canvas_course_id }),
					});
					needsReload = true;
				} catch (err) {
					console.error("Failed to link class:", err);
				}
			} else if (!matchingClass) {
				try {
					await api("/classes", {
						method: "POST",
						body: JSON.stringify({
							name,
							color: colors[
								Math.floor(Math.random() * colors.length)
							],
							canvas_course_id,
						}),
					});
					needsReload = true;
				} catch (err) {
					console.error("Failed to create class:", err);
				}
			}
		}

		if (needsReload) {
			await loadClasses();
		}
	}, [api, loadClasses]);

	return { ensureClassesExist };
}
