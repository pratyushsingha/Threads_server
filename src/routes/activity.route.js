import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllActivities } from "../controllers/activity.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getAllActivities);

export default router;
