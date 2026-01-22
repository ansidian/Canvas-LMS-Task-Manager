import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const CANVAS_DND_TOAST_ID = "canvas-dnd-override";
export const dismissToast = (id) => toast.dismiss(id);

let isToasterHovered = false;
let toasterNode = null;
let toasterHoverHandlers = null;
let toasterObserver = null;
const hoverSubscribers = new Set();

const notifyHoverSubscribers = (paused) => {
  hoverSubscribers.forEach((subscriber) => subscriber(paused));
};

const setToasterHovered = (paused) => {
  if (isToasterHovered === paused) return;
  isToasterHovered = paused;
  notifyHoverSubscribers(paused);
};

const detachToasterHoverListeners = () => {
  if (!toasterNode || !toasterHoverHandlers) return;
  toasterNode.removeEventListener("mouseenter", toasterHoverHandlers.onEnter);
  toasterNode.removeEventListener("mouseleave", toasterHoverHandlers.onLeave);
  toasterNode = null;
  toasterHoverHandlers = null;
  setToasterHovered(false);
};

const attachToasterHoverListeners = () => {
  const nextNode = document.querySelector("[data-sonner-toaster]");
  if (!nextNode) {
    detachToasterHoverListeners();
    return;
  }

  if (nextNode !== toasterNode) {
    detachToasterHoverListeners();
    toasterNode = nextNode;
    toasterHoverHandlers = {
      onEnter: () => setToasterHovered(true),
      onLeave: () => setToasterHovered(false),
    };
    toasterNode.addEventListener("mouseenter", toasterHoverHandlers.onEnter);
    toasterNode.addEventListener("mouseleave", toasterHoverHandlers.onLeave);
    setToasterHovered(toasterNode.matches(":hover"));
  }

  if (!toasterObserver) {
    toasterObserver = new MutationObserver(() => {
      const currentNode = document.querySelector("[data-sonner-toaster]");
      if (!currentNode) {
        detachToasterHoverListeners();
        return;
      }
      if (currentNode !== toasterNode) {
        attachToasterHoverListeners();
      }
    });
    toasterObserver.observe(document.body, { childList: true, subtree: true });
  }
};

const subscribeToasterHover = (subscriber) => {
  hoverSubscribers.add(subscriber);
  subscriber(isToasterHovered);
  return () => {
    hoverSubscribers.delete(subscriber);
  };
};

const toastComponent = ({
  toastId,
  title,
  description,
  actionLabel,
  onAction,
  countdown,
  type,
}) => {
  const CountdownLabel = () => {
    const [remaining, setRemaining] = useState(countdown || 0);
    const [isPaused, setIsPaused] = useState(false);
    const pausedRef = useRef(false);
    const endAtRef = useRef(0);
    const pausedAtRef = useRef(null);
    const lastRemainingRef = useRef(remaining);

    useEffect(() => {
      if (!countdown) return undefined;
      attachToasterHoverListeners();
      endAtRef.current = Date.now() + countdown * 1000;
      lastRemainingRef.current = countdown;
      setRemaining(countdown);

      const unsubscribe = subscribeToasterHover((paused) => {
        if (pausedRef.current === paused) return;
        pausedRef.current = paused;
        setIsPaused(paused);
        if (paused) {
          pausedAtRef.current = Date.now();
          return;
        }
        if (pausedAtRef.current) {
          const pausedDuration = Date.now() - pausedAtRef.current;
          endAtRef.current += pausedDuration;
          pausedAtRef.current = null;
        }
      });

      const intervalId = setInterval(() => {
        const now = Date.now();
        const effectiveEndAt =
          pausedRef.current && pausedAtRef.current
            ? endAtRef.current + (now - pausedAtRef.current)
            : endAtRef.current;
        const nextRemaining = Math.max(
          0,
          Math.ceil((effectiveEndAt - now) / 1000),
        );
        if (nextRemaining !== lastRemainingRef.current) {
          lastRemainingRef.current = nextRemaining;
          setRemaining(nextRemaining);
        }
        if (nextRemaining <= 0) {
          clearInterval(intervalId);
          toast.dismiss(toastId);
        }
      }, 1000);

      return () => {
        unsubscribe();
        clearInterval(intervalId);
      };
    }, []);

    const label =
      remaining > 0 ? `${actionLabel} (${remaining})` : actionLabel;
    const dismissLabel =
      remaining > 0 ? `Click to dismiss (${remaining})` : "Click to dismiss";
    const disabled = remaining <= 0;

    return (
      <button
        type="button"
        className="sonner-custom-toast__button"
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          onAction?.(event);
          toast.dismiss(toastId);
        }}
        disabled={disabled}
      >
        <span className="sonner-custom-toast__pause-slot" aria-hidden="true">
          <svg
            className={`sonner-custom-toast__pause-icon${
              isPaused && remaining > 0
                ? " sonner-custom-toast__pause-icon--visible"
                : ""
            }`}
            viewBox="0 0 10 10"
          >
            <rect x="1" y="1" width="3" height="8" rx="1" />
            <rect x="6" y="1" width="3" height="8" rx="1" />
          </svg>
        </span>
        <span className="sonner-custom-toast__button-label">
          <span className="sonner-custom-toast__button-measure">
            {label.length >= dismissLabel.length ? label : dismissLabel}
          </span>
          <span className="sonner-custom-toast__button-action">{label}</span>
          <span className="sonner-custom-toast__button-dismiss">
            {dismissLabel}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div
      className="sonner-custom-toast"
      data-type={type}
      onClick={() => toast.dismiss(toastId)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toast.dismiss(toastId);
        }
      }}
    >
      <div className="sonner-custom-toast__content">
        <div className="sonner-custom-toast__title">{title}</div>
        {description ? (
          <div className="sonner-custom-toast__detail">{description}</div>
        ) : null}
      </div>
      {actionLabel ? (
        countdown ? (
          <CountdownLabel />
        ) : (
          <button
            type="button"
            className="sonner-custom-toast__button"
            onClick={(event) => {
              event.stopPropagation();
              onAction?.(event);
              toast.dismiss(toastId);
            }}
          >
            <span className="sonner-custom-toast__button-label">
              <span className="sonner-custom-toast__button-measure">
                {actionLabel.length >= "Click to dismiss".length
                  ? actionLabel
                  : "Click to dismiss"}
              </span>
              <span className="sonner-custom-toast__button-action">
                {actionLabel}
              </span>
              <span className="sonner-custom-toast__button-dismiss">
                Click to dismiss
              </span>
            </span>
          </button>
        )
      ) : null}
    </div>
  );
};

const showToast = ({
  id,
  title,
  description,
  actionLabel,
  onAction,
  duration,
  countdown,
  type,
}) => {
  const toastId =
    id || `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  toast.custom(
    (t) =>
      toastComponent({
        toastId: t,
        title,
        description,
        actionLabel,
        onAction,
        countdown,
        type,
      }),
    {
      id: toastId,
      duration,
    },
  );
  return toastId;
};

export const notifySuccess = (message, options = {}) => {
  const description = options.description;
  return showToast({
    title: message,
    description,
    duration: options.duration,
    type: "success",
  });
};

export const notifyError = (message, options = {}) => {
  const description = options.description;
  return showToast({
    title: message,
    description,
    duration: options.duration,
    type: "error",
  });
};

export const notifyAction = ({
  id,
  title,
  message,
  description,
  actionLabel,
  onAction,
  duration = 7000,
  countdown,
}) => {
  const content = title || message || "";
  const detail = description || (title ? message : undefined);
  return showToast({
    id,
    title: content,
    description: detail,
    actionLabel,
    onAction,
    duration,
    countdown,
    type: "action",
  });
};

export const notifyUndo = ({
  title,
  message,
  onUndo,
  duration = 7000,
  undoLabel = "Undo",
}) => {
  const content = title || message || "";
  const detail = title ? message : undefined;
  const totalSeconds = Math.max(1, Math.ceil(duration / 1000));
  const id = `undo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  showToast({
    id,
    title: content,
    description: detail,
    actionLabel: undoLabel,
    onAction: onUndo,
    duration,
    countdown: totalSeconds,
    type: "undo",
  });

  return () => toast.dismiss(id);
};
