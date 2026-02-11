import { Router } from "express";
import { listAuditLogs } from "../controllers/auditLogController";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, requireAdmin, listAuditLogs);

export default router;
