import { Router } from "express";
import { body, param } from "express-validator";
import {
  createPost,
  deletePost,
  getPostById,
  getPosts,
  updatePost,
} from "../controllers/postController";
import { requireAuth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", getPosts);

router.get(
  "/:id",
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
