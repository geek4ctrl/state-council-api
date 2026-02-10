import { Request, Response } from "express";
import { pool } from "../config/database";

type PostStatus = "draft" | "review" | "published";

type PostExtras = {
  excerpt?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  externalLink?: string | null;
  showOnHomePage?: boolean | null;
  showOnRegistration?: boolean | null;
};

const extractPostExtras = (body: Record<string, unknown>): PostExtras => {
  const imageUrl = (body.imageUrl ?? body.image_url) as string | null | undefined;
  const date = (body.date ?? body.event_date) as string | null | undefined;
  const time = (body.time ?? body.event_time) as string | null | undefined;
  const externalLink = (body.externalLink ?? body.external_link) as string | null | undefined;
  const showOnHomePage = (body.showOnHomePage ?? body.show_on_home_page) as
    | boolean
    | null
    | undefined;
  const showOnRegistration = (body.showOnRegistration ?? body.show_on_registration) as
    | boolean
    | null
    | undefined;

  return {
    excerpt: (body.excerpt as string | null | undefined) ?? null,
    category: (body.category as string | null | undefined) ?? null,
    imageUrl: imageUrl ?? null,
    date: date ?? null,
    time: time ?? null,
    location: (body.location as string | null | undefined) ?? null,
    externalLink: externalLink ?? null,
    showOnHomePage: showOnHomePage ?? null,
    showOnRegistration: showOnRegistration ?? null,
  };
};

export const getPosts = async (_req: Request, res: Response): Promise<void> => {
  const user = _req.user;
  const isAdmin = user?.role === "admin";

  let query = `
      SELECT posts.id, posts.title, posts.content, posts.status,
        posts.excerpt, posts.category, posts.image_url,
        posts.event_date AS date, posts.event_time AS time,
        posts.location, posts.external_link,
        posts.show_on_home_page, posts.show_on_registration,
        posts.created_at, posts.updated_at,
           users.id as author_id, users.email as author_email
    FROM posts
    JOIN users ON users.id = posts.author_id
  `;
  const params: Array<string | number> = [];

  if (!isAdmin) {
    if (user?.id) {
      query += " WHERE posts.status = 'published' OR posts.author_id = $1";
      params.push(user.id);
    } else {
      query += " WHERE posts.status = 'published'";
    }
  }

  query += " ORDER BY posts.created_at DESC";

  const result = await pool.query(query, params);

  res.json({ posts: result.rows });
};

export const getPostById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const postId = Number(req.params.id);
  const result = await pool.query(
      `SELECT posts.id, posts.title, posts.content, posts.status,
        posts.excerpt, posts.category, posts.image_url,
        posts.event_date AS date, posts.event_time AS time,
        posts.location, posts.external_link,
        posts.show_on_home_page, posts.show_on_registration,
        posts.created_at, posts.updated_at,
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

  const post = result.rows[0] as {
    author_id: number;
    status: PostStatus;
  };
  const user = req.user;
  const isAdmin = user?.role === "admin";
  const isAuthor = user?.id === post.author_id;

  if (post.status !== "published" && !isAdmin && !isAuthor) {
    res.status(404).json({ message: "Post not found." });
    return;
  }

  res.json({ post: result.rows[0] });
};

export const createPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, content, status } = req.body as {
    title: string;
    content: string;
    status?: PostStatus;
  } & PostExtras;
  const extras = extractPostExtras(req.body as Record<string, unknown>);
  const authorId = req.user?.id;
  const isAdmin = req.user?.role === "admin";
  const postStatus: PostStatus = isAdmin && status ? status : "draft";

  if (!authorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const result = await pool.query(
    `INSERT INTO posts (
       title,
       content,
       author_id,
       status,
       excerpt,
       category,
       image_url,
       event_date,
       event_time,
       location,
       external_link,
       show_on_home_page,
       show_on_registration
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, title, content, status, excerpt, category, image_url,
               event_date AS date, event_time AS time, location, external_link,
               show_on_home_page, show_on_registration, author_id, created_at, updated_at`,
    [
      title,
      content,
      authorId,
      postStatus,
      extras.excerpt,
      extras.category,
      extras.imageUrl,
      extras.date,
      extras.time,
      extras.location,
      extras.externalLink,
      extras.showOnHomePage ?? false,
      extras.showOnRegistration ?? false,
    ]
  );

  res.status(201).json({ post: result.rows[0] });
};

export const updatePost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const postId = Number(req.params.id);
  const { title, content, status } = req.body as {
    title?: string;
    content?: string;
    status?: PostStatus;
  } & PostExtras;
  const extras = extractPostExtras(req.body as Record<string, unknown>);

  const postResult = await pool.query(
    "SELECT author_id, status FROM posts WHERE id = $1",
    [postId]
  );

  if (postResult.rowCount === 0) {
    res.status(404).json({ message: "Post not found." });
    return;
  }

  const post = postResult.rows[0] as {
    author_id: number;
    status: PostStatus;
  };
  const user = req.user;
  const isAdmin = user?.role === "admin";
  const isAuthor = user?.id === post.author_id;

  if (!user || (!isAdmin && !isAuthor)) {
    res.status(403).json({ message: "Forbidden." });
    return;
  }

  if (status && !isAdmin) {
    if (!isAuthor || status !== "review" || post.status !== "draft") {
      res.status(403).json({ message: "Forbidden." });
      return;
    }
  }

  const updated = await pool.query(
    `UPDATE posts
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         status = COALESCE($3, status),
         excerpt = COALESCE($4, excerpt),
         category = COALESCE($5, category),
         image_url = COALESCE($6, image_url),
         event_date = COALESCE($7, event_date),
         event_time = COALESCE($8, event_time),
         location = COALESCE($9, location),
         external_link = COALESCE($10, external_link),
         show_on_home_page = COALESCE($11, show_on_home_page),
         show_on_registration = COALESCE($12, show_on_registration),
         updated_at = NOW()
     WHERE id = $13
     RETURNING id, title, content, status, excerpt, category, image_url,
               event_date AS date, event_time AS time, location, external_link,
               show_on_home_page, show_on_registration, author_id, created_at, updated_at`,
    [
      title ?? null,
      content ?? null,
      status ?? null,
      extras.excerpt,
      extras.category,
      extras.imageUrl,
      extras.date,
      extras.time,
      extras.location,
      extras.externalLink,
      extras.showOnHomePage ?? null,
      extras.showOnRegistration ?? null,
      postId,
    ]
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
