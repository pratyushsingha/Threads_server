import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import passport from "passport";
import GoogleStrategy from "passport-google-oidc";
import {
  changePassword,
  checkauthSts,
  generateAccessAndRefreshToken,
  getCurrentUser,
  loginUser,
  logoutUser,
  myProfileDetails,
  registerUser,
  searchUser,
  suggestUser,
  updateAvatar,
  updateCoverImage,
  updateUserDetails,
  userProfile,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { User } from "../../models/user.model.js";

const router = Router();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_SIGNIN_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (issuer, profile, cb) => {
      console.log(profile);
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = new User({
            username: profile.displayName,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            googleId: profile.id,
            avatar: `https://ui-avatars.com/api/?name=${profile.displayName}&background=random&color=fff`,
            provider: "google",
          });
          await user.save();
        }
        return cb(null, user);
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  process.nextTick(() => {
    cb(null, { id: user.id, username: user.username, name: user.fullName });
  });
});

passport.deserializeUser((user, cb) => {
  process.nextTick(() => {
    return cb(null, user);
  });
});

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

router.get("/login/federated/google", passport.authenticate("google"));
router.route("/login").post(loginUser);
router.get(
  "/oauth2/redirect/google",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FROTEND_URL}/login`,
  }),
  async (req, res) => {
    console.log(req.user);
    try {
      const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        req.user._id
      );
      const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      };
      res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .redirect(`${process.env.FROTEND_URL}/`);
    } catch (error) {
      console.log("google callback signin error", error);
      res.redirect(`${process.env.FROTEND_URL}/login`);
    }
  }
);

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/auth/status").get(checkauthSts);

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
  .route("/coverimage")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router.route("/change-password").patch(verifyJWT, changePassword);
router
  .route("/profile")
  .patch(verifyJWT, upload.single("avatar"), updateUserDetails);
router.route("/profile/u/:username").get(verifyJWT, userProfile);
router.route("/profile/my").get(verifyJWT, myProfileDetails);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/search").get(verifyJWT, searchUser);
router.route("/suggestions").get(verifyJWT, suggestUser);

export default router;
