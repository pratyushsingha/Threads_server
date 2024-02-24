import mongoose, { isValidObjectId } from "mongoose";
import { APiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../../models/tweet.model.js";
import { User } from "../../models/user.model.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content, isAnonymous } = req.body;
  if (!content) {
    throw new APiError(400, "tweet can't be empty");
  }
  let imagesLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.images) &&
    req.files.images.length > 0
  ) {
    imagesLocalPath = req.files.images.map((file) => file.path);
  }
  // console.log(imagesLocalPath);

  let uploadImages = [];
  if (imagesLocalPath && imagesLocalPath.length > 0) {
    for (let path of imagesLocalPath) {
      const uploadedImage = await cloudinaryUpload(path);
      uploadImages.push(uploadedImage.url);
    }
  }

  const tweet = await Tweet.create({
    content,
    images: uploadImages,
    isAnonymous,
    owner: req.user._id,
  });
  if (!tweet) {
    throw new APiError(500, "unable to create tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "tweet created successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!tweetId) {
    throw new APiError(400, "tweetId is required");
  }

  const existingTweet = await Tweet.findById(tweetId);
  if (!existingTweet) {
    throw new APiError(400, "tweet doesn't exist");
  }

  const verifyUser =
    existingTweet.owner?._id.toString() === req.user?._id.toString();
  if (!verifyUser) {
    throw new APiError(400, "unauthorized access");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedTweet) {
    throw new APiError(500, "unable to update the tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, updatedTweet, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const existingTweet = await Tweet.findById(tweetId);
  if (!existingTweet) {
    throw new APiError(400, "tweet doesn't exist");
  }

  const verifyUser =
    existingTweet.owner?._id.toString() === req.user?._id.toString();
  if (!verifyUser) {
    throw new APiError(400, "unauthorized access");
  }
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!deletedTweet) {
    throw new APiError(500, "unable to delte the tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, "tweet deleted successfully"));
});

const myTweets = asyncHandler(async (req, res) => {
  const userTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
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

  if (!userTweets)
    throw new APiError(500, "something went wrong while fetching ur tweets");

  return res
    .status(200)
    .json(new ApiResponse(201, userTweets, "tweets fetched successfully"));
});

const toggleIsAnonymous = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new APiError(422, "tweetId is required");

  if (!isValidObjectId(tweetId)) throw new APiError(409, "invalid tweetId");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new APiError(409, "tweet doesn't exist");

  if (!(tweet.owner.toString() === req.user?._id.toString()))
    throw new APiError(409, "unAuthorized request");
  let toggleStatus;
  if (tweet.isAnonymous === true) {
    toggleStatus = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          isAnonymous: false,
        },
      },
      { new: true }
    );
    if (!toggleStatus)
      throw new APiError(500, "something went wrong while updating the status");

    return res.status(200).json(
      new ApiResponse(
        201,
        {
          isAnonymous: false,
        },
        "tweet set to public"
      )
    );
  }

  toggleStatus = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        isAnonymous: true,
      },
    },
    { new: true }
  );

  if (!toggleStatus)
    throw new APiError(500, "something went wrong while updating the status");

  return res.status(200).json(
    new ApiResponse(
      201,
      {
        isAnonymous: true,
      },
      "tweet set to private"
    )
  );
});

const feedTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const tweetAggregate = Tweet.aggregate([
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

  const tweets = await Tweet.aggregatePaginate(
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

  if (!tweets)
    throw new APiError(500, "something went wrong while fetching the feed");

  return res
    .status(200)
    .json(new ApiResponse(201, tweets, "tweets fetched successfully"));
});

const getTweetById = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new APiError(422, "tweetId is missing");

  if (!isValidObjectId(tweetId)) throw new APiError(409, "tweetId is invalid");

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) throw new APiError(409, "tweet doesn't exists");

  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "tweet fetched successfully"));
});

export {
  createTweet,
  updateTweet,
  deleteTweet,
  myTweets,
  toggleIsAnonymous,
  feedTweets,
  getTweetById,
};
