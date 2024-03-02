import mongoose from "mongoose";
import { Bookmark } from "../../models/bookmark.model.js";
import { Tweet } from "../../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../../models/user.model.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";

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
      {
        $lookup: {
          from: "users",
          localField: "owner",
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
        $unwind: {
          path: "$ownerDetails",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweetId",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "tweetId",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "bookmarks",
          localField: "_id",
          foreignField: "tweetId",
          as: "bookmarks",
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
                $in: [req.user?._id, "$likes.likedBy"],
              },
              then: true,
              else: false,
            },
          },
          isBookmarked: {
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
        $project: {
          likes: 0,
          comments: 0,
          bookmarks: 0,
        },
      },
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
      {
        $lookup: {
          from: "users",
          localField: "owner",
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
        $unwind: {
          path: "$ownerDetails",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweetId",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "tweetId",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "bookmarks",
          localField: "_id",
          foreignField: "tweetId",
          as: "bookmarks",
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
                $in: [req.user?._id, "$likes.likedBy"],
              },
              then: true,
              else: false,
            },
          },
          isBookmarked: {
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
        $project: {
          likes: 0,
          comments: 0,
          bookmarks: 0,
        },
      },
    ]);

    return res.status(200).json(new ApiResponse(200, tweet, "unbookmarked"));
  }
});

const allBookMarkedTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const bookmarkedTweets = await Bookmark.aggregate([
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
        as: "bookmarkedTweet",
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
        ],
      },
    },
    {
      $project: {
        _id: 0,
        bookmarkedTweet: 1,
      },
    },
    {
      $unwind: "$bookmarkedTweet",
    },
    {
      $lookup: {
        from: "likes",
        localField: "bookmarkedTweet._id",
        foreignField: "tweetId",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "bookmarkedTweet._id",
        foreignField: "tweetId",
        as: "comments",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
        commentCount: { $size: "$comments" },
        isLiked: {
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
      $project: {
        likes: 0,
        comments: 0,
      },
    },
  ]);

  const tweets = await Bookmark.aggregatePaginate(
    bookmarkedTweets,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "bookmarkedTweets",
        docs: "tweets",
      },
    })
  );

  if (!bookmarkedTweetsAggregate) {
    throw new ApiError(500, "something went wrong while fetching the tweets");
  }
  // console.log(bookmarkedTweet);

  return res
    .status(200)
    .json(
      new ApiResponse(
        201,
        bookmarkedTweets,
        "bookmarked tweets fetched successfully"
      )
    );
});

export { bookmarkTweet, allBookMarkedTweets };
