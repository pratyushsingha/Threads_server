import express from "express";
import cors from "cors";
import requestIp from "request-ip";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(requestIp.mw());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.clientIp;
  },
  handler: (_, __, ___, options) => {
    throw new ApiError(
      options.statusCode || 500,
      `There are too many requests. You are only allowed ${
        options.max
      } requests per ${options.windowMs / 60000} minutes`
    );
  },
});

app.use(limiter);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./src/routes/user.route.js";
import tweetRouter from "./src/routes/tweet.route.js";
import healthcheckRouter from "./src/routes/healthCheck.route.js";
import likeRouter from "./src/routes/like.route.js";
import commentRouter from "./src/routes/comment.route.js";
import followRouter from "./src/routes/follow.route.js";
import bookmarkRouter from "./src/routes/bookmark.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/follow", followRouter);
app.use("/api/v1/bookmarks", bookmarkRouter);

export { app };
