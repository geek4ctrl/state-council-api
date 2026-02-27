import { Router } from "express";
import { param } from "express-validator";
import { listSessions, revokeSession } from "../controllers/sessionsController";
import { requireAuth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", requireAuth, listSessions);

router.delete(
  "/:id",
  requireAuth,
  [param("id").notEmpty().withMessage("Session id is required")],
  validateRequest,
  revokeSession
);

export default router;
