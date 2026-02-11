import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import usersRoutes from "./routes/usersRoutes";
import auditRoutes from "./routes/auditRoutes";

const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
	})
);
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.get("/docs.json", (_req, res) => {
	res.json(swaggerSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/audit", auditRoutes);

app.use((req, res) => {
	res.status(404).json({ message: "Route not found.", path: req.path });
});

app.use(
	(
		err: Error,
		_req: express.Request,
		res: express.Response,
		_next: express.NextFunction
	) => {
		res.status(500).json({ message: err.message ?? "Server error" });
	}
);

export default app;
