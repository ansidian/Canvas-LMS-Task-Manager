import { useEffect, useState } from "react";
import { toast } from "sonner";

export const CANVAS_DND_TOAST_ID = "canvas-dnd-override";
export const dismissToast = (id) => toast.dismiss(id);

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

    useEffect(() => {
      if (!countdown) return undefined;
      const intervalId = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(intervalId);
    }, []);

    const label =
      remaining > 0 ? `${actionLabel} (${remaining})` : actionLabel;
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
        {label}
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
            {actionLabel}
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
