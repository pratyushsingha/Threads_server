import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerFile = fs.readFileSync(
  path.resolve(__dirname, "./swagger.yaml"),
  "utf8"
);

const swaggerDocument = YAML.parse(swaggerFile);

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    Credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./src/routes/user.route.js";
import tweetRouter from "./src/routes/tweet.route.js";
import healthcheckRouter from "./src/routes/healthCheck.route.js";
import likeRouter from "./src/routes/like.route.js";
import commentRouter from "./src/routes/comment.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/comments", commentRouter);

app.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      docExpansion: "none",
    },
    customSiteTitle: "FreeAPI Docs",
  })
);

export { app };
