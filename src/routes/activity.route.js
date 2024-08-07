import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getActivities } from "../controllers/activity.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getActivities);

export default router;
