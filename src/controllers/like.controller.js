import mongoose from "mongoose";
import { Comment } from "../../models/comment.model.js";
import { Like } from "../../models/like.model.js";
import { Tweet } from "../../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";
import { tweetAggregation } from "./tweet.controller.js";

const disLikeTweet = asyncHandler(async (req, res, tweetId) => {
  const dislikedTweet = await Like.findOneAndDelete({
    tweetId,
    likedBy: req.user?._id,
  });
  const tweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweetId),
      },
    },
    ...tweetAggregation(req),
  ]);
  if (!dislikedTweet) throw new ApiError(500, "unable to dislike the tweet");

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "tweet disliked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new ApiError(400, "tweet id is missing");

  const tweetExists = await Tweet.findById(tweetId);

  if (!tweetExists) throw new ApiError(400, "tweet doesn't exists");
  const isAlreadyLiked = await Like.findOne({
    tweetId,
    likedBy: req.user?._id,
  });
  //   console.log(isAlreadyLiked);
  if (!isAlreadyLiked) {
    const likedTweet = await Like.create({
      tweetId,
      likedBy: req.user._id,
    });

    const tweet = await Tweet.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(tweetId),
        },
      },
      ...tweetAggregation(req),
    ]);

    if (!likedTweet) throw new ApiError(500, "unable to like the tweet");
    return res
      .status(200)
      .json(new ApiResponse(201, tweet, "tweet liked successfully"));
  }

  if (isAlreadyLiked) {
    await disLikeTweet(req, res, tweetId);
  }
});

const likedTweets = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const tweetAggregate = Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweetId",
        foreignField: "_id",
        as: "likedTweets",
      },
    },
    {
      $unwind: "$likedTweets",
    },
    {
      $lookup: {
        from: "users",
        localField: "likedTweets.owner",
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
      $unwind: "$ownerDetails",
    },
    {
      $lookup: {
        from: "bookmarks",
        localField: "likedTweets._id",
        foreignField: "tweetId",
        as: "bookmarks",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "likedTweets._id",
        foreignField: "tweetId",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "likedTweets._id",
        foreignField: "tweetId",
        as: "likes",
      },
    },
    {
      $addFields: {
        "likedTweets.likeCount": {
          $size: "$likes",
        },
        "likedTweets.ownerDetails": "$ownerDetails",
        "likedTweets.isLiked": true,
        "likedTweets.commentCount": {
          $size: "$comments",
        },
        "likedTweets.isBookmarked": {
          $cond: {
            if: {
              $in: [req.user?._id, "$bookmarks.bookmarkedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        likedTweets: { $push: "$likedTweets" },
      },
    },
  ]);

  if (!tweetAggregate)
    throw new ApiError(
      500,
      "something went wrong while fetching the liked tweets"
    );

  const tweets = await Like.aggregatePaginate(
    tweetAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "totalTweets",
        docs: "tweets",
      },
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(201, tweets, "liked tweets fetched successfully"));
});

export { toggleTweetLike, likedTweets };
