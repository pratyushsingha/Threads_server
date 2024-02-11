import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  CommentOnTweet,
  commentOnComment,
  deleteComment,
  editComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/tweet/:tweetId").post(verifyJWT, CommentOnTweet);

router.route("/comment/:commentId").post(verifyJWT, commentOnComment);
router
  .route("/comment/:commentId")
  .patch(verifyJWT, editComment)
  .delete(verifyJWT, deleteComment);

export default router;
