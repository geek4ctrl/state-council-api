import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Senate Portal API",
    version: "1.0.0",
    description: "API documentation for the Senate Portal",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Local server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      AuthRegister: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "user@example.com" },
          password: { type: "string", example: "secret123" },
        },
      },
      AuthLogin: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "user@example.com" },
          password: { type: "string", example: "secret123" },
        },
      },
      PostCreate: {
        type: "object",
        required: ["title", "content"],
        properties: {
          title: { type: "string", example: "My first post" },
          content: { type: "string", example: "Post content goes here" },
          excerpt: { type: "string", example: "Short summary" },
          category: { type: "string", example: "News" },
          imageUrl: { type: "string", example: "https://example.com/image.jpg" },
          date: { type: "string", format: "date", example: "2026-02-10" },
          time: { type: "string", example: "14:30" },
          location: { type: "string", example: "Main Hall" },
          externalLink: { type: "string", example: "https://example.com" },
          showOnHomePage: { type: "boolean", example: true },
          showOnRegistration: { type: "boolean", example: false },
          status: {
            type: "string",
            enum: ["draft", "review", "published"],
            example: "draft",
          },
        },
      },
      PostUpdate: {
        type: "object",
        properties: {
          title: { type: "string", example: "Updated title" },
          content: { type: "string", example: "Updated content" },
          excerpt: { type: "string", example: "Short summary" },
          category: { type: "string", example: "News" },
          imageUrl: { type: "string", example: "https://example.com/image.jpg" },
          date: { type: "string", format: "date", example: "2026-02-10" },
          time: { type: "string", example: "14:30" },
          location: { type: "string", example: "Main Hall" },
          externalLink: { type: "string", example: "https://example.com" },
          showOnHomePage: { type: "boolean", example: true },
          showOnRegistration: { type: "boolean", example: false },
          status: {
            type: "string",
            enum: ["draft", "review", "published"],
            example: "review",
          },
        },
      },
      UserRoleUpdate: {
        type: "object",
        required: ["role"],
        properties: {
          role: { type: "string", enum: ["user", "admin"], example: "admin" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "API is healthy",
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRegister" },
            },
          },
        },
        responses: {
          "201": { description: "User created" },
          "409": { description: "Email already in use" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthLogin" },
            },
          },
        },
        responses: {
          "200": { description: "Logged in" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/posts": {
      get: {
        summary: "List posts",
        responses: {
          "200": { description: "Posts list" },
        },
      },
      post: {
        summary: "Create a post",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PostCreate" },
            },
          },
        },
        responses: {
          "201": { description: "Post created" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/posts/{id}": {
      get: {
        summary: "Get a post by id",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "Post" },
          "404": { description: "Post not found" },
        },
      },
      put: {
        summary: "Update a post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PostUpdate" },
            },
          },
        },
        responses: {
          "200": { description: "Post updated" },
          "403": { description: "Forbidden" },
          "404": { description: "Post not found" },
        },
      },
      delete: {
        summary: "Delete a post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "204": { description: "Post deleted" },
          "403": { description: "Forbidden" },
          "404": { description: "Post not found" },
        },
      },
    },
    "/api/users/{id}/role": {
      patch: {
        summary: "Update a user's role",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserRoleUpdate" },
            },
          },
        },
        responses: {
          "200": { description: "Role updated" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "User not found" },
        },
      },
    },
    "/api/users": {
      get: {
        summary: "List users",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Users list" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
        },
      },
    },
  },
};

export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [],
});
