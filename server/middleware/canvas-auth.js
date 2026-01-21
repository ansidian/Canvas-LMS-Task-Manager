import {
  normalizeCanvasBaseUrl,
  normalizeCanvasToken,
} from "../services/canvas-api.js";
import db from "../db/connection.js";

const DEFAULT_OPTIONS = { stripApiPath: false };

export const validateCanvasCredentials =
  (options = DEFAULT_OPTIONS) =>
  async (req, res, next) => {
    let canvasUrl = req.headers["x-canvas-url"];
    let canvasToken = req.headers["x-canvas-token"];

    if ((!canvasUrl || !canvasToken) && req.auth) {
      try {
        const userId = req.auth().userId;
        const result = await db.execute({
          sql: "SELECT canvas_url, canvas_token FROM settings WHERE user_id = ?",
          args: [userId],
        });
        if (result.rows.length > 0) {
          canvasUrl = canvasUrl || result.rows[0].canvas_url;
          canvasToken = canvasToken || result.rows[0].canvas_token;
        }
      } catch (err) {
        console.error("Error loading Canvas credentials:", err);
        return res
          .status(500)
          .json({ message: "Failed to load Canvas credentials" });
      }
    }

    if (!canvasUrl || !canvasToken) {
      return res.status(400).json({ message: "Canvas URL and token required" });
    }

    req.canvasBaseUrl = normalizeCanvasBaseUrl(canvasUrl, {
      stripApiPath: options.stripApiPath,
    });
    req.canvasToken = normalizeCanvasToken(canvasToken);
    next();
  };
