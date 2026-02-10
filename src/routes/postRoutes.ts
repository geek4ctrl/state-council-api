import { Router } from "express";
import { body, param } from "express-validator";
import {
  createPost,
  deletePost,
  getPostById,
  getPosts,
  updatePost,
} from "../controllers/postController";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", optionalAuth, getPosts);

router.get(
  "/:id",
  optionalAuth,
  [param("id").isInt().withMessage("Post id must be an integer")],
  validateRequest,
  getPostById
);

router.post(
  "/",
  requireAuth,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("content").notEmpty().withMessage("Content is required"),
    body("excerpt").optional().isString(),
    body("category").optional().isString(),
    body("imageUrl").optional().isString(),
    body("date").optional().isISO8601(),
    body("time").optional().isString(),
    body("location").optional().isString(),
    body("externalLink").optional().isString(),
    body("showOnHomePage").optional().isBoolean(),
    body("showOnRegistration").optional().isBoolean(),
    body("status")
      .optional()
      .isIn(["draft", "review", "published"])
      .withMessage("Status must be draft, review, or published"),
  ],
  validateRequest,
  createPost
);

router.put(
  "/:id",
  requireAuth,
  [
    param("id").isInt().withMessage("Post id must be an integer"),
    body("title").optional().isString(),
    body("content").optional().isString(),
    body("excerpt").optional().isString(),
    body("category").optional().isString(),
    body("imageUrl").optional().isString(),
    body("date").optional().isISO8601(),
    body("time").optional().isString(),
    body("location").optional().isString(),
    body("externalLink").optional().isString(),
    body("showOnHomePage").optional().isBoolean(),
    body("showOnRegistration").optional().isBoolean(),
    body("status")
      .optional()
      .isIn(["draft", "review", "published"])
      .withMessage("Status must be draft, review, or published"),
  ],
  validateRequest,
  updatePost
);

router.delete(
  "/:id",
  requireAuth,
  [param("id").isInt().withMessage("Post id must be an integer")],
  validateRequest,
  deletePost
);

export default router;
