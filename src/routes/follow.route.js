import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { followUnfollowUser } from "../controllers/follow.controller.js";

const router = Router();

router.route("/:followerId").post(verifyJWT, followUnfollowUser);

export default router;
