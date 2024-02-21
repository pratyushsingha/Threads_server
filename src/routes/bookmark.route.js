import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  allBookMarkedTweets,
  bookmarkTweet,
} from "../controllers/bookmark.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/:tweetId").post(bookmarkTweet);
router.route("/").get(allBookMarkedTweets);

export default router;
