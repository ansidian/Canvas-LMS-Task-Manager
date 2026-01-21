import { requireAuth } from "@clerk/express";

export const requireUser = () => requireAuth();
