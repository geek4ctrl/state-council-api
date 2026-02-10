import { Router } from "express";
import { body, param } from "express-validator";
import { listUsers, updateUserRole } from "../controllers/usersController";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", requireAuth, requireAdmin, listUsers);

router.patch(
  "/:id/role",
  requireAuth,
  requireAdmin,
  [
    param("id").isInt().withMessage("User id must be an integer"),
    body("role")
      .isIn(["user", "admin"])
      .withMessage("Role must be user or admin"),
  ],
  validateRequest,
  updateUserRole
);

export default router;
