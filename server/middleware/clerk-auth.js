import { requireAuth } from "@clerk/express";

const clerkAuth = requireAuth();

export const requireUser = () => (req, res, next) => {
  if (req.apiKeyAuth) return next();
  clerkAuth(req, res, next);
};
