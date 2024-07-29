import mongoose from "mongoose";
import { Repost } from "../../models/repost.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions, getPusherActivityOptions } from "../utils/helper.js";
import { Activity } from "../../models/activity.model.js";
import { pusher } from "../../app.js";
import { Tweet } from "../../models/tweet.model.js";

const createRepost = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "tweet not found");
  }

  const tweetOwnerId = tweet.owner.toString();

  const repost = await Repost.create({
    tweetId,
    userId: req.user._id,
    isTweet: tweetId ? true : false,
  });

  if (!repost) {
    throw new ApiError(500, "something went wrong while reposting the tweet");
  }

  const activity = new Activity({
    activityType: "reposted",
    pathId: tweetId,
    notifiedUserId: tweetOwnerId,
    userId: req.user._id,
  });

  await activity.save();

  pusher.trigger(
    `userActivity-${tweetOwnerId}`,
    "repost",
    getPusherActivityOptions("reposted", req, tweetOwnerId)
  );

  return res
    .status(200)
    .json(new ApiResponse(201, repost, "reposted successfully"));
});

const getTweetReposts = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page, limit } = req.query;

  const userId = await User.findOne({ username }).select("_id");

  const repostAggregate = Repost.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isTweet: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "tweetId",
        foreignField: "tweetId",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweetId",
        foreignField: "tweetId",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweetId",
        foreignField: "_id",
        as: "tweetDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$ownerDetails",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "bookmarks",
        localField: "tweetId",
        foreignField: "tweetId",
        as: "bookmarks",
      },
    },
    {
      $unwind: {
        path: "$ownerDetails",
      },
    },
    {
      $unwind: {
        path: "$tweetDetails",
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: "$likes",
        },
        commentCount: {
          $size: "$comments",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$likes.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
        isBookmarked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$bookmarks.bookmarkedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $set: {
        "tweetDetails.likeCount": "$likeCount",
        "tweetDetails.isLiked": "$isLiked",
        "tweetDetails.commentCount": "$commentCount",
        "tweetDetails.isBookmarked": "$isBookmarked",
      },
    },
    {
      $project: {
        _id: 1,
        tweetId: 1,
        tweetDetails: 1,
        ownerDetails: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!repostAggregate) {
    throw new ApiError(404, "No reposts found");
  }

  const tweetReposts = await Repost.aggregatePaginate(
    repostAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "totalReposts",
        docs: "reposts",
      },
    })
  );

  return res
    .status(201)
    .json(
      new ApiResponse(200, tweetReposts, "reposted tweets fetched successfully")
    );
});

export { createRepost, getTweetReposts };
