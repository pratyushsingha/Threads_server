import { Follow } from "../../models/follow.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const followUnfollowUser = asyncHandler(async (req, res) => {
  const { followerId } = req.params;

  const userExists = await User.findById(followerId);
  if (!userExists) throw new ApiError(400, "user doesn't exists");

  if (followerId.toString() === req.user?._id.toString())
    throw new ApiError(422, "u can't follow yourself");

  const alreadyFollowed = await Follow.findOne({
    followerId,
    followedBy: req.user?._id,
  });

  if (!alreadyFollowed) {
    const follow = await Follow.create({
      followerId,
      followedBy: req.user?._id,
    });
    if (!follow)
      throw new ApiError(500, "something went wrong while following the user");
    return res.status(200).json(
      new ApiResponse(
        201,
        {
          isFollowed: true,
        },
        "followed successfully"
      )
    );
  }

  if (alreadyFollowed) {
    const unFollow = await Follow.deleteOne({
      followerId,
      followedBy: req.user?._id,
    });

    if (unFollow.deletedCount === 0)
      throw new ApiError(500, "something went wrong while following the user");

    return res.status(200).json(
      new ApiResponse(
        201,
        {
          isFollowed: false,
        },
        "unfollowed successfully"
      )
    );
  }
});


export { followUnfollowUser};
