import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  likedTweets,
  toggleCommentLike,
  toggleTweetLike,
} from "../controllers/like.controller.js";

const router = Router();

router.route("/tweet/:tweetId").post(verifyJWT, toggleTweetLike);
router.route("/comment/:commentId").post(verifyJWT, toggleCommentLike);
router.route("/tweets").get(verifyJWT, likedTweets);

export default router;
