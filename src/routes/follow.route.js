import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  followingUsersTweets,
  followUnfollowUser,
} from "../controllers/follow.controller.js";

const router = Router();

router.route("/:followerId").post(verifyJWT, followUnfollowUser);
router.route("/tweets").get(verifyJWT, followingUsersTweets);

export default router;
