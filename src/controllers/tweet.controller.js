import { APiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../../models/tweet.model.js";
import { User } from "../../models/user.model.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content, isAnonymous } = req.body;
  if (!content) {
    throw new APiError(400, "tweet can't be empty");
  }
  //   console.log(req.user);
  const tweet = await Tweet.create({
    content,
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

const getAllTweets = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new APiError(400, "username is Misssing");
  }

  const userTweets = await User.aggregate([
    [
      {
        $match: {
          username,
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
        $project: {
          allTweets: 1,
        },
      },
    ],
  ]);

  return res
    .status(200)
    .json(new ApiResponse(201, userTweets, "tweets fetched successfully"));
});

export { createTweet, updateTweet, deleteTweet, getAllTweets };
