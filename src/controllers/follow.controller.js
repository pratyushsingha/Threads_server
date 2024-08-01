import mongoose from "mongoose";
import { Follow } from "../../models/follow.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { tweetAggregation } from "./tweet.controller.js";
import {
  getMongoosePaginationOptions,
  getPusherActivityOptions,
} from "../utils/helper.js";
import { Activity } from "../../models/activity.model.js";
import { pusher } from "../../app.js";

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

    const activity = new Activity({
      activityType: "follow",
      pathId: followerId,
      notifiedUserId: followerId,
      userId: req.user._id,
    });

    await activity.save();

    pusher.trigger(
      `userActivity-${followerId}`,
      "follow",
      getPusherActivityOptions("follow", req, followerId)
    );

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

const followingUsersTweets = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const tweetsAggregate = Follow.aggregate([
    [
      {
        $match: {
          followedBy: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "tweets",
          localField: "followerId",
          foreignField: "owner",
          as: "tweets",
          pipeline: [...tweetAggregation(req)],
        },
      },
      {
        $unwind: {
          path: "$tweets",
        },
      },
      {
        $group: {
          _id: null,
          tweets: {
            $push: "$tweets",
          },
        },
      },
    ],
  ]);

  if (!tweetsAggregate)
    return res.status(200).json(new ApiResponse(200, [], "no tweets found"));

  const tweets = await Follow.aggregatePaginate(
    tweetsAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "followingTweets",
        docs: "tweets",
      },
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "tweets fethed successfully"));
});

export { followUnfollowUser, followingUsersTweets };
