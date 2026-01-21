import { Router } from "express";
import classesRoutes from "./classes-routes.js";
import eventsRoutes from "./events-routes.js";
import settingsRoutes from "./settings-routes.js";
import canvasRoutes from "./canvas-routes.js";

const router = Router();

router.use("/classes", classesRoutes);
router.use("/events", eventsRoutes);
router.use("/", settingsRoutes);
router.use("/canvas", canvasRoutes);

export default router;
