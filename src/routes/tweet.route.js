import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";

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
router
  .route("/:tweetId")
  .get(verifyJWT, getTweetById)
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);
router.route("/my").get(verifyJWT, myTweets);
router.route("/tweetStatus/:tweetId").patch(verifyJWT, toggleIsAnonymous);
router.route("/").get(verifyJWT, feedTweets);

export default router;
