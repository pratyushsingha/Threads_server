import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  feedTweets,
  getAllTweets,
  toggleIsAnonymous,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createTweet);
router
  .route("/:tweetId")
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);
router.route("/my").get(verifyJWT,getAllTweets);
router.route("/tweetStatus/:tweetId").patch(verifyJWT, toggleIsAnonymous);
router.route("/").get(feedTweets);

export default router;
