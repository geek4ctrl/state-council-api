import { Request, Response } from "express";
import { pool } from "../config/database";

export const getPosts = async (_req: Request, res: Response): Promise<void> => {
  const result = await pool.query(
    `SELECT posts.id, posts.title, posts.content, posts.created_at, posts.updated_at,
            users.id as author_id, users.email as author_email
     FROM posts
     JOIN users ON users.id = posts.author_id
     ORDER BY posts.created_at DESC`
  );

  res.json({ posts: result.rows });
};

export const getPostById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const postId = Number(req.params.id);
  const result = await pool.query(
    `SELECT posts.id, posts.title, posts.content, posts.created_at, posts.updated_at,
            users.id as author_id, users.email as author_email
     FROM posts
     JOIN users ON users.id = posts.author_id
     WHERE posts.id = $1`,
    [postId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ message: "Post not found." });
    return;
  }

  res.json({ post: result.rows[0] });
};

export const createPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, content } = req.body as { title: string; content: string };
  const authorId = req.user?.id;

  if (!authorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const result = await pool.query(
    `INSERT INTO posts (title, content, author_id)
     VALUES ($1, $2, $3)
     RETURNING id, title, content, author_id, created_at, updated_at`,
    [title, content, authorId]
  );

  res.status(201).json({ post: result.rows[0] });
};

export const updatePost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const postId = Number(req.params.id);
  const { title, content } = req.body as {
    title?: string;
    content?: string;
  };

  const postResult = await pool.query(
    "SELECT author_id FROM posts WHERE id = $1",
    [postId]
  );

  if (postResult.rowCount === 0) {
    res.status(404).json({ message: "Post not found." });
    return;
  }

  const post = postResult.rows[0];
  const user = req.user;

  if (!user || (user.role !== "admin" && user.id !== post.author_id)) {
    res.status(403).json({ message: "Forbidden." });
    return;
  }

  const updated = await pool.query(
    `UPDATE posts
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, title, content, author_id, created_at, updated_at`,
    [title ?? null, content ?? null, postId]
  );

  res.json({ post: updated.rows[0] });
};

export const deletePost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const postId = Number(req.params.id);
  const postResult = await pool.query(
    "SELECT author_id FROM posts WHERE id = $1",
    [postId]
  );

  if (postResult.rowCount === 0) {
    res.status(404).json({ message: "Post not found." });
    return;
  }

  const post = postResult.rows[0];
  const user = req.user;

  if (!user || (user.role !== "admin" && user.id !== post.author_id)) {
    res.status(403).json({ message: "Forbidden." });
    return;
  }

  await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
  res.status(204).send();
};
