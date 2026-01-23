import {
  clearGuestData,
  getGuestClasses,
  getGuestEvents,
  getGuestPendingItems,
  getGuestRejectedItems,
  getGuestSettings,
  setGuestClasses,
  setGuestEvents,
  setGuestPendingItems,
  setGuestRejectedItems,
  setGuestSettings,
  setGuestLastFetchTimestamp,
} from "./guestStorage";

const sortEvents = (events) =>
  [...events].sort((a, b) => {
    const aTime = a?.due_date ? new Date(a.due_date).getTime() : 0;
    const bTime = b?.due_date ? new Date(b.due_date).getTime() : 0;
    return aTime - bTime;
  });

const sortClasses = (classes) =>
  [...classes].sort((a, b) => {
    const orderDiff = (a?.sort_order ?? 0) - (b?.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });

const buildClassLookup = (classes) =>
  new Map(classes.map((cls) => [String(cls.id), cls]));

const attachClassFields = (event, classesById) => {
  const cls = event?.class_id
    ? classesById.get(String(event.class_id))
    : null;
  return {
    ...event,
    class_name: cls?.name ?? null,
    class_color: cls?.color ?? null,
  };
};

const parseBody = (options) => {
  if (!options?.body) return {};
  if (typeof options.body === "string") {
    try {
      return JSON.parse(options.body);
    } catch (err) {
      throw new Error("Invalid JSON body");
    }
  }
  return options.body;
};

const requireArray = (value, message) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(message);
  }
  return value;
};

const resolveId = (value) => String(value);

const updateClasses = (updater) => {
  const current = getGuestClasses();
  const next = updater([...current]);
  setGuestClasses(next);
  return sortClasses(next);
};

const updateEvents = (updater) => {
  const current = getGuestEvents();
  const next = updater([...current]);
  setGuestEvents(next);
  return sortEvents(next);
};

const buildCanvasHeaders = (options = {}) => {
  const { canvas_url: canvasUrl, canvas_token: canvasToken } = getGuestSettings();
  return {
    "Content-Type": "application/json",
    "X-Canvas-Url": canvasUrl,
    "X-Canvas-Token": canvasToken,
    ...(options.headers || {}),
  };
};

const requestGuestCanvas = async (endpoint, options = {}) => {
  const res = await fetch(`/api/guest${endpoint}`, {
    ...options,
    headers: buildCanvasHeaders(options),
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
};

export default async function guestApi(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const path = endpoint.split("?")[0];
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "events") {
    const classes = getGuestClasses();
    const classesById = buildClassLookup(classes);

    if (segments.length === 1 && method === "GET") {
      return sortEvents(getGuestEvents()).map((event) =>
        attachClassFields(event, classesById),
      );
    }

    if (segments.length === 1 && method === "POST") {
      const body = parseBody(options);
      const now = new Date().toISOString();
      const newEvent = {
        id: crypto.randomUUID(),
        title: body.title,
        description: body.description ?? null,
        due_date: body.due_date,
        class_id: body.class_id ?? null,
        event_type: body.event_type ?? null,
        status: body.status || "incomplete",
        notes: body.notes ?? null,
        url: body.url ?? null,
        canvas_id: body.canvas_id ?? null,
        points_possible: body.points_possible ?? null,
        canvas_due_date_override: body.canvas_due_date_override ?? 0,
        created_at: now,
        updated_at: now,
      };
      const sorted = updateEvents((events) => [...events, newEvent]);
      return attachClassFields(
        sorted.find((event) => event.id === newEvent.id) || newEvent,
        classesById,
      );
    }

    if (segments.length === 2 && method === "PATCH") {
      const body = parseBody(options);
      const eventId = resolveId(segments[1]);
      let updatedEvent = null;
      const sorted = updateEvents((events) => {
        return events.map((event) => {
          if (resolveId(event.id) !== eventId) return event;
          updatedEvent = {
            ...event,
            ...body,
            updated_at: new Date().toISOString(),
          };
          return updatedEvent;
        });
      });
      const fallback = sorted.find((event) => resolveId(event.id) === eventId);
      if (!updatedEvent && fallback) {
        updatedEvent = fallback;
      }
      if (!updatedEvent) {
        throw new Error("Event not found");
      }
      return attachClassFields(updatedEvent, classesById);
    }

    if (segments.length === 2 && method === "DELETE") {
      const eventId = resolveId(segments[1]);
      updateEvents((events) =>
        events.filter((event) => resolveId(event.id) !== eventId),
      );
      return { success: true };
    }
  }

  if (segments[0] === "classes") {
    if (segments.length === 1 && method === "GET") {
      return sortClasses(getGuestClasses());
    }

    if (segments.length === 1 && method === "POST") {
      const body = parseBody(options);
      const now = new Date().toISOString();
      const sorted = updateClasses((classes) => {
        const nextSortOrder = classes.reduce(
          (max, cls) => Math.max(max, cls.sort_order ?? -1),
          -1,
        ) + 1;
        const newClass = {
          id: crypto.randomUUID(),
          name: body.name,
          color: body.color || "#3498db",
          canvas_course_id: body.canvas_course_id ?? null,
          is_synced: body.is_synced ?? 1,
          sort_order: nextSortOrder,
          created_at: now,
        };
        return [...classes, newClass];
      });
      return sorted[sorted.length - 1];
    }

    if (segments.length === 2 && segments[1] === "order" && method === "PATCH") {
      const body = parseBody(options);
      const orderedIds = requireArray(
        body.orderedIds,
        "orderedIds must be a non-empty array",
      );
      return updateClasses((classes) => {
        const orderMap = new Map(
          orderedIds.map((id, index) => [resolveId(id), index]),
        );
        return classes.map((cls) => {
          const nextOrder = orderMap.get(resolveId(cls.id));
          if (nextOrder === undefined) return cls;
          return { ...cls, sort_order: nextOrder };
        });
      });
    }

    if (segments.length === 2 && method === "PATCH") {
      const body = parseBody(options);
      const classId = resolveId(segments[1]);
      const keys = Object.keys(body || {});
      if (keys.length === 0) {
        throw new Error("No fields to update");
      }
      let updatedClass = null;
      const sorted = updateClasses((classes) =>
        classes.map((cls) => {
          if (resolveId(cls.id) !== classId) return cls;
          updatedClass = {
            ...cls,
            ...body,
            is_synced:
              body.is_synced === undefined
                ? cls.is_synced
                : body.is_synced
                ? 1
                : 0,
          };
          return updatedClass;
        }),
      );
      if (!updatedClass) {
        updatedClass = sorted.find((cls) => resolveId(cls.id) === classId);
      }
      if (!updatedClass) {
        throw new Error("Class not found");
      }
      return updatedClass;
    }

    if (segments.length === 2 && method === "DELETE") {
      const classId = resolveId(segments[1]);
      updateEvents((events) =>
        events.filter((event) => resolveId(event.class_id) !== classId),
      );
      updateClasses((classes) =>
        classes.filter((cls) => resolveId(cls.id) !== classId),
      );
      return { success: true };
    }
  }

  if (segments[0] === "settings") {
    if (segments.length === 1 && method === "GET") {
      return getGuestSettings();
    }
    if (segments.length === 1 && method === "PATCH") {
      const body = parseBody(options);
      const keys = Object.keys(body || {});
      if (keys.length === 0) {
        throw new Error("No fields to update");
      }
      const next = {
        ...getGuestSettings(),
        ...body,
      };
      setGuestSettings(next);
      return next;
    }
  }

  if (segments[0] === "canvas") {
    if (segments.length === 2 && segments[1] === "assignments" && method === "GET") {
      const data = await requestGuestCanvas(endpoint, {
        signal: options.signal,
        headers: options.headers,
      });
      const approvedIds = new Set(
        getGuestEvents()
          .map((event) => event?.canvas_id)
          .filter(Boolean),
      );
      const rejectedIds = new Set(
        getGuestRejectedItems()
          .map((item) => (typeof item === "string" ? item : item?.canvas_id))
          .filter(Boolean),
      );
      const assignments = Array.isArray(data?.assignments)
        ? data.assignments.filter(
            (assignment) =>
              !approvedIds.has(assignment?.canvas_id) &&
              !rejectedIds.has(assignment?.canvas_id),
          )
        : [];
      return {
        assignments,
        courses: data?.courses,
        allAssignments: data?.allAssignments,
      };
    }
    if (segments.length === 2 && segments[1] === "assignment" && method === "GET") {
      return requestGuestCanvas(endpoint, {
        signal: options.signal,
        headers: options.headers,
      });
    }
    if (
      segments.length === 3 &&
      segments[1] === "submissions" &&
      segments[2] === "self" &&
      method === "GET"
    ) {
      return requestGuestCanvas(endpoint, {
        signal: options.signal,
        headers: options.headers,
      });
    }
  }

  if (segments[0] === "rejected") {
    if (segments.length === 1 && method === "POST") {
      const body = parseBody(options);
      const canvasId = body.canvas_id;
      if (!canvasId) {
        throw new Error("canvas_id is required");
      }
      const rejected = getGuestRejectedItems();
      const alreadyExists = rejected.some((item) => {
        if (typeof item === "string") return item === canvasId;
        return item?.canvas_id === canvasId;
      });
      if (!alreadyExists) {
        rejected.push({
          canvas_id: canvasId,
          rejected_at: new Date().toISOString(),
        });
        setGuestRejectedItems(rejected);
      }
      return { success: true };
    }
  }

  if (segments[0] === "reset-data") {
    if (segments.length === 1 && method === "POST") {
      clearGuestData();
      setGuestPendingItems([]);
      setGuestLastFetchTimestamp(null);
      return { success: true };
    }
  }

  throw new Error(`Unsupported guest route: ${method} ${endpoint}`);
}
