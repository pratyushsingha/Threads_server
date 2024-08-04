import express from "express";
import cors from "cors";
import requestIp from "request-ip";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import Pusher from "pusher";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    console.log("Status Code:", res.statusCode); // Log the status code
    if (res.statusCode < 100 || res.statusCode > 599) {
      res.statusCode = 500; // Set to 500 if invalid
    }
    return originalSend.call(this, body);
  };
  next();
});

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

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

app.use(limiter);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

import userRouter from "./src/routes/user.route.js";
import tweetRouter from "./src/routes/tweet.route.js";
import healthcheckRouter from "./src/routes/healthCheck.route.js";
import likeRouter from "./src/routes/like.route.js";
import followRouter from "./src/routes/follow.route.js";
import bookmarkRouter from "./src/routes/bookmark.route.js";
import repostRouter from "./src/routes/repost.route.js";
import activityRouter from "./src/routes/activity.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/follow", followRouter);
app.use("/api/v1/bookmarks", bookmarkRouter);
app.use("/api/v1/reposts", repostRouter);
app.use("/api/v1/activities", activityRouter);

export { app, pusher };
