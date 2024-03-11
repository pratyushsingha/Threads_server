import mongoose from "mongoose";
import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "something went wrong while genetation access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password, tags, bio } = req.body;
  if (
    [fullName, email, username, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "user with this email or username already exists");
  }
  console.log(req.files);

  let avatarLocalPath, coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  let tag = tags?.split(" ");

  const avatar = await cloudinaryUpload(avatarLocalPath);
  const coverImage = await cloudinaryUpload(coverImageLocalPath);
  console.log(avatar);
  const user = await User.create({
    fullName,
    username,
    email,
    password,
    avatar:
      avatar?.url ||
      `https://ui-avatars.com/api/?name=${fullName}&background=random&color=fff`,
    coverImage: coverImage?.url || "https://shorturl.at/oKNUV",
    tags: tag,
    bio,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(400, "user doesn't exist");
  }
  const validatedPassword = await user.isPasswordCorrect(password);

  if (!validatedPassword) {
    throw new ApiError(401, "invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedinUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, {}, "logged out successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await cloudinaryUpload(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image is required");
  }

  const coverImage = await cloudinaryUpload(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "error occured while updating the cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(201, user, "coverImage updated successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  const validateOldPassword = await user.isPasswordCorrect(oldPassword);

  if (!validateOldPassword) {
    throw new ApiError(400, "invalid old password");
  }
  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(201, "password changed successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { username, email, fullName, portfolio, tags, bio } = req.body;

  const usernameExists = await User.findOne({ username: { $eq: username } });
  if (usernameExists)
    throw new ApiError(422, "an user with this username already exists");

  let tag = tags.split(" ");

  const updatedprofileDetails = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        username,
        email,
        fullName,
        tags: tag,
        portfolio,
        bio,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(
      new ApiResponse(
        201,
        updatedprofileDetails,
        "profile updated successfully"
      )
    );
});

const userProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username.trim()) {
    throw new ApiError(400, "username is Misssing");
  }

  const profileDetails = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "_id",
        foreignField: "owner",
        as: "allTweets",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followedBy",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followerId",
        as: "following",
      },
    },
    {
      $addFields: {
        followersCount: {
          $size: "$followers",
        },
        followingCount: {
          $size: "$following",
        },
        isFollowing: {
          $cond: {
            if: { $in: [req.user?._id, "$followers.followerId"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        createdAt: 1,
        coverImage: 1,
        avatar: 1,
        followersCount: 1,
        followingCount: 1,
        isFollowing: 1,
      },
    },
  ]);

  if (!profileDetails)
    throw new ApiError(500, "something went wrong while fetching user details");

  return res
    .status(200)
    .json(new ApiResponse(201, profileDetails, "profile fetched successfully"));
});

const myProfileDetails = asyncHandler(async (req, res) => {
  const profileDetails = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "_id",
        foreignField: "owner",
        as: "allTweets",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followedBy",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followerId",
        as: "following",
      },
    },
    {
      $addFields: {
        followersCount: {
          $size: "$followers",
        },
        followingCount: {
          $size: "$following",
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        createdAt: 1,
        coverImage: 1,
        avatar: 1,
        tags: 1,
        bio: 1,
        portfolio: 1,
        followersCount: 1,
        followingCount: 1,
      },
    },
  ]);

  if (!profileDetails)
    throw new ApiError(500, "something went wrong while fetching your profile");

  return res
    .status(200)
    .json(new ApiResponse(201, profileDetails, "profile fetched successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(201, req.user, "user fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  updateAvatar,
  updateCoverImage,
  changePassword,
  updateUserDetails,
  userProfile,
  getCurrentUser,
  myProfileDetails,
};
