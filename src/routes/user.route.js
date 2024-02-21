import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  myProfileDetails,
  registerUser,
  updateAvatar,
  updateCoverImage,
  updateUserDetails,
  userProfile,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
  .route("/coverimage")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router.route("/change-password").patch(verifyJWT, changePassword);
router.route("/profile").patch(verifyJWT, updateUserDetails);
router.route("/profile/u/:username").get(verifyJWT,userProfile);
router.route("/profile/my").get(verifyJWT,myProfileDetails);
router.route("/current-user").get(verifyJWT, getCurrentUser);
export default router;
