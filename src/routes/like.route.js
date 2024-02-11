import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  toggleCommentLike,
  toggleTweetLike,
} from "../controllers/like.controller.js";

const router = Router();

router.route("/tweet/:tweetId").post(verifyJWT, toggleTweetLike);
router.route("/comment/:commentId").post(verifyJWT, toggleCommentLike);

export default router;
