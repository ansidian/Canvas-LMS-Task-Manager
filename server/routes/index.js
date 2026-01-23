import { Router } from "express";
import classesRoutes from "./classes-routes.js";
import eventsRoutes from "./events-routes.js";
import settingsRoutes from "./settings-routes.js";
import canvasRoutes from "./canvas-routes.js";
import canvasGuestRoutes from "./canvas-guest-routes.js";
import mergeRoutes from "./merge-routes.js";

const router = Router();

router.use("/classes", classesRoutes);
router.use("/events", eventsRoutes);
router.use("/canvas", canvasRoutes);
router.use("/guest/canvas", canvasGuestRoutes);
router.use("/merge", mergeRoutes);
router.use("/", settingsRoutes);

export default router;
