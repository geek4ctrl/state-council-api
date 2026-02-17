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
    {
      url: "https://patient-wonder-production.up.railway.app",
      description: "Production server (Railway)",
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
      UserLockUpdate: {
        type: "object",
        required: ["locked"],
        properties: {
          locked: { type: "boolean", example: true },
        },
      },
      UserPasswordReset: {
        type: "object",
        required: ["password"],
        properties: {
          password: { type: "string", example: "TempPass123" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          actor_id: { type: "integer", example: 12 },
          actor_email: { type: "string", example: "admin@example.com" },
          action: { type: "string", example: "posts.created" },
          entity_type: { type: "string", example: "post" },
          entity_id: { type: "string", example: "42" },
          details: { type: "object", nullable: true },
          ip: { type: "string", example: "127.0.0.1" },
          user_agent: { type: "string", example: "Mozilla/5.0" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      AuditLogList: {
        type: "object",
        properties: {
          logs: {
            type: "array",
            items: { $ref: "#/components/schemas/AuditLog" },
          },
          total: { type: "integer", example: 150 },
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
    "/api/users/{id}/lock": {
      patch: {
        summary: "Lock or unlock a user",
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
              schema: { $ref: "#/components/schemas/UserLockUpdate" },
            },
          },
        },
        responses: {
          "200": { description: "User lock updated" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "User not found" },
        },
      },
    },
    "/api/users/{id}/reset-password": {
      post: {
        summary: "Reset a user's password",
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
              schema: { $ref: "#/components/schemas/UserPasswordReset" },
            },
          },
        },
        responses: {
          "200": { description: "Password reset" },
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
    "/api/audit": {
      get: {
        summary: "List audit logs",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "entityType", in: "query", schema: { type: "string" } },
          { name: "actorId", in: "query", schema: { type: "integer" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Audit logs",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditLogList" },
              },
            },
          },
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
