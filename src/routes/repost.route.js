import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createRepost,
  getTweetReposts,
} from "../controllers/repost.controller.js";

const router = Router();

router.route("/tweet/:tweetId").post(verifyJWT, createRepost);
router.route("/tweet/:username").get(verifyJWT, getTweetReposts);

export default router;
