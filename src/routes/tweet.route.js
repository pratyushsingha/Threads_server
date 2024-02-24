import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  feedTweets,
  getTweetById,
  myTweets,
  toggleIsAnonymous,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createTweet);
router
  .route("/:tweetId")
  .get(verifyJWT, getTweetById)
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);
router.route("/my").get(verifyJWT, myTweets);
router.route("/tweetStatus/:tweetId").patch(verifyJWT, toggleIsAnonymous);
router.route("/").get(verifyJWT, feedTweets);

export default router;
