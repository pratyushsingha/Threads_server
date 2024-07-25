import mongoose from "mongoose";
import { Bookmark } from "../../models/bookmark.model.js";
import { Tweet } from "../../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";
import { tweetAggregation } from "./tweet.controller.js";

const bookmarkTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) throw new ApiError(400, "tweetId is missing");

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) throw new ApiError(422, "tweet doesn't exists");

  const isAlreadyBookmarked = await Bookmark.findOne({
    tweetId,
    bookmarkedBy: req.user?._id,
  });

  if (!isAlreadyBookmarked) {
    const bookmarkedTweet = await Bookmark.create({
      tweetId,
      bookmarkedBy: req.user?._id,
    });

    if (!bookmarkedTweet)
      throw new ApiError(
        500,
        "something went wrong while bookmarking the tweet"
      );

    const tweet = await Tweet.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(tweetId),
        },
      },
      ...tweetAggregation(req),
    ]);

    return res.status(200).json(new ApiResponse(200, tweet, "bookmarked"));
  }

  if (isAlreadyBookmarked) {
    const unBookmarkedTweet = await Bookmark.findOneAndDelete({
      tweetId,
      bookmarkedBy: req.user?._id,
    });

    if (!unBookmarkedTweet)
      throw new ApiError(
        500,
        "something went wrong while bookmarking the tweet"
      );

    const tweet = await Tweet.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(tweetId),
        },
      },
      ...tweetAggregation(req),
    ]);

    return res.status(200).json(new ApiResponse(200, tweet, "unbookmarked"));
  }
});

const allBookMarkedTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const bookmarkTweetAggregate = Bookmark.aggregate([
    {
      $match: {
        bookmarkedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweetId",
        foreignField: "_id",
        as: "bookmarkedTweets",
      },
    },
    {
      $unwind: "$bookmarkedTweets",
    },
    {
      $lookup: {
        from: "users",
        localField: "bookmarkedTweets.owner",
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
        from: "likes",
        localField: "bookmarkedTweets._id",
        foreignField: "tweetId",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "bookmarkedTweets._id",
        foreignField: "tweetId",
        as: "comments",
      },
    },
    {
      $addFields: {
        "bookmarkedTweets.likeCount": {
          $size: "$likes",
        },
        "bookmarkedTweets.isBookmarked": true,
        "bookmarkedTweets.ownerDetails": "$ownerDetails",
        "bookmarkedTweets.commentCount": { $size: "$comments" },
        "bookmarkedTweets.isLiked": {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes.likedBy"],
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
        bookmarkedTweet: {
          $push: "$bookmarkedTweets",
        },
      },
    },
  ]);

  if (!bookmarkTweetAggregate) {
    throw new ApiError(500, "something went wrong while fetching the tweets");
  }

  const tweets = await Bookmark.aggregatePaginate(
    bookmarkTweetAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "bookmarkedTweets",
        docs: "tweets",
      },
    })
  );
  const isEmpty = tweets.tweets[0].bookmarkedTweet.length;
  if (isEmpty < 1) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          201,
          (tweets.tweets[0].bookmarkedTweet = []),
          "bookmarked tweets fetched successfully"
        )
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        201,
        tweets.tweets[0],
        "bookmarked tweets fetched successfully"
      )
    );
});

export { bookmarkTweet, allBookMarkedTweets };
