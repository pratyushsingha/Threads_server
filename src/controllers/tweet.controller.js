import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../../models/tweet.model.js";
import { User } from "../../models/user.model.js";
import {
  getMongoosePaginationOptions,
  getPusherActivityOptions,
} from "../utils/helper.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { Activity } from "../../models/activity.model.js";
import { pusher } from "../../app.js";

export const tweetAggregation = (req) => {
  return [
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweetId",
        as: "likes",
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
      $lookup: {
        from: "tweets",
        localField: "_id",
        foreignField: "tweetId",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "reposts",
        localField: "_id",
        foreignField: "tweetId",
        as: "reposts",
      },
    },
    {
      $unwind: {
        path: "$ownerDetails",
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
        isReposted: {
          $cond: {
            if: {
              $in: [req.user?._id, "$reposts.userId"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        isAnonymous: 1,
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        ownerDetails: 1,
        likeCount: 1,
        commentCount: 1,
        isLiked: 1,
        isBookmarked: 1,
        isReposted: 1,
        tweetId: 1,
      },
    },
  ];
};

const createTweet = asyncHandler(async (req, res) => {
  const { content, isAnonymous, tags } = req.body;
  if (!content) {
    throw new ApiError(400, "tweet can't be empty");
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
  const tag = tags?.split(" #");

  let uploadImages = [];
  if (imagesLocalPath && imagesLocalPath.length > 0) {
    for (let path of imagesLocalPath) {
      const uploadedImage = await cloudinaryUpload(path);
      console.log("Uploaded image:", uploadedImage);
      if (uploadedImage && uploadedImage.url) {
        uploadImages.push(uploadedImage.url);
      }
    }
  }

  const tweet = await Tweet.create({
    content,
    images: uploadImages,
    isAnonymous,
    tags: tag,
    owner: req.user._id,
    isTweet: true,
  });
  if (!tweet) {
    throw new ApiError(500, "unable to create tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "tweet created successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!tweetId) {
    throw new ApiError(400, "tweetId is required");
  }

  const existingTweet = await Tweet.findById(tweetId);
  if (!existingTweet) {
    throw new ApiError(400, "tweet doesn't exist");
  }

  const verifyUser =
    existingTweet.owner?._id.toString() === req.user?._id.toString();
  if (!verifyUser) {
    throw new ApiError(400, "unauthorized access");
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
    throw new ApiError(500, "unable to update the tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, updatedTweet, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const existingTweet = await Tweet.findById(tweetId);
  if (!existingTweet) {
    throw new ApiError(400, "tweet doesn't exist");
  }

  const verifyUser =
    existingTweet.owner?._id.toString() === req.user?._id.toString();
  if (!verifyUser) {
    throw new ApiError(400, "unauthorized access");
  }
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!deletedTweet) {
    throw new ApiError(500, "unable to delte the tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, "tweet deleted successfully"));
});

const myTweets = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { username } = req.params;

  const userId = await User.findOne({ username }).select("_id");
  if (!userId) {
    throw new ApiError(404, "User not found");
  }

  const userTweetAggregate = Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        tweetId: null,
      },
    },
    ...tweetAggregation(req),
  ]);

  if (!userTweetAggregate)
    throw new ApiError(500, "something went wrong while fetching ur tweets");

  const tweets = await Tweet.aggregatePaginate(
    userTweetAggregate,
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
    .json(new ApiResponse(201, tweets, "tweets fetched successfully"));
});

const publicTweets = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { username } = req.params;

  const userId = await User.findOne({ username }).select("_id");
  if (!userId) {
    throw new ApiError(404, "User not found");
  }
  const publicTweetsAggregate = Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        isAnonymous: false,
        tweetId: null,
      },
    },
    ...tweetAggregation(req),
  ]);

  if (!publicTweetsAggregate)
    throw new ApiError(
      500,
      "something went wrong while fetching all the tweets"
    );

  const tweets = await Tweet.aggregatePaginate(
    publicTweetsAggregate,
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
    .json(new ApiResponse(201, tweets, "public tweets fetched successfully"));
});

const toggleIsAnonymous = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new ApiError(422, "tweetId is required");

  if (!isValidObjectId(tweetId)) throw new ApiError(409, "invalid tweetId");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(409, "tweet doesn't exist");

  if (!(tweet.owner.toString() === req.user?._id.toString()))
    throw new ApiError(409, "unAuthorized request");
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
      throw new ApiError(500, "something went wrong while updating the status");

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
    throw new ApiError(500, "something went wrong while updating the status");

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
      $match: {
        tweetId: null,
      },
    },
    ...tweetAggregation(req),
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
    throw new ApiError(500, "something went wrong while fetching the feed");

  return res
    .status(200)
    .json(new ApiResponse(201, tweets, "tweets fetched successfully"));
});

const getTweetById = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new ApiError(422, "tweetId is missing");

  if (!isValidObjectId(tweetId)) throw new ApiError(409, "tweetId is invalid");

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) throw new ApiError(409, "tweet doesn't exists");

  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "tweet fetched successfully"));
});

const tweetDetails = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) throw new ApiError(422, "tweetId is required");

  if (!isValidObjectId(tweetId))
    throw new ApiError(422, "tweetId is not valid");

  const tweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweetId),
      },
    },
    ...tweetAggregation(req),
  ]);

  if (!tweet)
    throw new ApiError(
      500,
      "something went wrong while fetching tweet Details"
    );

  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "tweet fetched successfully"));
});

const replyOnTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content, isAnonymous, tags } = req.body;

  const tweetExists = await Tweet.findById(tweetId);
  if (!tweetExists) {
    throw new ApiError(404, "tweet not found");
  }
  const tweetOwnerId = tweetExists.owner.toString();

  if (!content) {
    throw new ApiError(400, "tweet can't be empty");
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
  const tag = tags?.split(" #");

  let uploadImages = [];
  if (imagesLocalPath && imagesLocalPath.length > 0) {
    for (let path of imagesLocalPath) {
      const uploadedImage = await cloudinaryUpload(path);
      console.log("Uploaded image:", uploadedImage);
      if (uploadedImage && uploadedImage.url) {
        uploadImages.push(uploadedImage.url);
      }
    }
  }

  const tweet = await Tweet.create({
    content,
    images: uploadImages,
    isAnonymous,
    tags: tag,
    owner: req.user._id,
    tweetId,
    isTweet: false,
  });

  if (!tweet) {
    throw new ApiError(500, "unable to create tweet");
  }

  const activity = new Activity({
    activityType: "reply",
    pathId: tweetId,
    notifiedUserId: tweetOwnerId,
    userId: req.user._id,
  });

  await activity.save();

  pusher.trigger(
    `userActivity-${tweetOwnerId}`,
    "reply",
    getPusherActivityOptions("reply", req, tweetId)
  );

  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "replied on tweet successfully"));
});

const getAllReplies = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { tweetId } = req.params;

  const replyAggregate = Tweet.aggregate([
    {
      $match: {
        tweetId: new mongoose.Types.ObjectId(tweetId),
      },
    },
    ...tweetAggregation(req),
  ]);

  if (!replyAggregate) {
    throw new ApiError(500, "something went wrong");
  }

  const tweetReplies = await Tweet.aggregatePaginate(
    replyAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "totalReplies",
        docs: "replies",
      },
    })
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, tweetReplies, "tweet replies fetched successfully")
    );
});

const getAllRepliedTweets = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { username } = req.params;

  const userId = await User.findOne({ username }).select("_id");

  const repliedTweetAggregation = Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        isTweet: false,
      },
    },
    ...tweetAggregation(req),
    {
      $lookup: {
        from: "tweets",
        localField: "tweetId",
        foreignField: "_id",
        as: "tweetDetails",
        pipeline: [...tweetAggregation(req)],
      },
    },
    {
      $unwind: {
        path: "$tweetDetails",
      },
    },
  ]);

  if (!repliedTweetAggregation) {
    throw new ApiError(500, "something went wrong while getting repliedTweets");
  }

  const tweets = await Tweet.aggregatePaginate(
    repliedTweetAggregation,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "totalRepliedTweets",
        docs: "repliedTweets",
      },
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(201, tweets, "tweets fetched successfully"));
});

export {
  createTweet,
  updateTweet,
  deleteTweet,
  myTweets,
  toggleIsAnonymous,
  feedTweets,
  getTweetById,
  publicTweets,
  tweetDetails,
  replyOnTweet,
  getAllReplies,
  getAllRepliedTweets,
};
