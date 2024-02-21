import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";




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
