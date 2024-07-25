import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";

import {
  createTweet,
  deleteTweet,
  feedTweets,
  getAllRepliedTweets,
  getAllReplies,
  getTweetById,
  myTweets,
  publicTweets,
  replyOnTweet,
  toggleIsAnonymous,
  tweetDetails,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { MAXIMUM_TWEET_IMAGE_COUNT } from "../../constants.js";

const router = Router();

router.route("/").post(
  verifyJWT,
  upload.fields([
    {
      name: "images",
      maxCount: MAXIMUM_TWEET_IMAGE_COUNT,
    },
  ]),
  createTweet
);

router.route("/tweets/:username").get(verifyJWT, myTweets);
router.route("/:username").get(verifyJWT, publicTweets);
router
  .route("/:tweetId")
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet)
  .get(verifyJWT, getTweetById);

router.route("/tweet/:tweetId").get(verifyJWT, tweetDetails);
router.route("/tweetStatus/:tweetId").patch(verifyJWT, toggleIsAnonymous);
router.route("/").get(verifyJWT, feedTweets);
router
  .route("/reply/:tweetId")
  .get(verifyJWT, getAllReplies)
  .post(
    verifyJWT,
    upload.fields([
      {
        name: "images",
        maxCount: MAXIMUM_TWEET_IMAGE_COUNT,
      },
    ]),
    replyOnTweet
  );
router.route("/reply/u/:username").get(verifyJWT, getAllRepliedTweets);

export default router;
