import { Router } from "express";
import { body, param } from "express-validator";
import {
  listUsers,
  resetUserPassword,
  setUserLock,
  updateUserRole,
} from "../controllers/usersController";
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

router.patch(
  "/:id/lock",
  requireAuth,
  requireAdmin,
  [
    param("id").isInt().withMessage("User id must be an integer"),
    body("locked").isBoolean().withMessage("Locked must be boolean"),
  ],
  validateRequest,
  setUserLock
);

router.post(
  "/:id/reset-password",
  requireAuth,
  requireAdmin,
  [
    param("id").isInt().withMessage("User id must be an integer"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validateRequest,
  resetUserPassword
);

export default router;
