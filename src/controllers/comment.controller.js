import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../../models/comment.model.js";
import { Tweet } from "../../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";

const CommentOnTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!tweetId) throw new ApiError(400, "tweet id is missing");

  const tweetExists = await Tweet.findById(tweetId);
  if (!tweetExists) throw new ApiError(400, "tweet doesn't exists");

  const commentedTweet = await Comment.create({
    tweetId,
    content,
    owner: req.user?._id,
  });
  if (!commentedTweet)
    throw new ApiError(
      500,
      "something went wrong while commenting on this tweet"
    );

  return res.status(200).json(new ApiResponse(201, "commented successfully"));
});

const commentOnComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) throw new ApiError(400, "comment id is missing");

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new ApiError(400, "comment doesn't exists");

  const commentedComment = await Comment.create({
    commentId,
    content,
    owner: req.user?._id,
  });
  if (!commentedComment) throw new ApiError(500, "unable to comment");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "commented successfully"));
});

const editComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) throw new ApiError(400, "comment id is missing");

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new ApiError(400, "comment doesn't exists");

  const verifyUser =
    commentExists.owner.toString() === req.user?._id.toString();
  verifyUser;
  if (!verifyUser) throw new ApiError(400, "unathorized edit");

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { $set: { content } },
    { new: true }
  );

  if (!updatedComment)
    throw new ApiError(500, "something went wrong while updating the tweet");

  return res
    .status(200)
    .json(new ApiResponse(201, {}, "comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) throw new ApiError(400, "comment id is missing");

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new ApiError(400, "comment doesn't exists");

  const verifyUser =
    commentExists.owner.toString() === req.user?._id.toString();
  console.log(verifyUser);
  if (!verifyUser) throw new ApiError(400, "unathorized edit");

  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) throw new ApiError(500, "unable to delete the comment");

  return res.status(200).json(201, {}, "comment deleted successfully");
});

const tweetComments = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!tweetId) throw new ApiError(422, "tweetId is required");
  if (!isValidObjectId(tweetId))
    throw new ApiError(422, "tweetId is not valid");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(409, "tweet doesn't exists");

  const comments = await Comment.aggregate([
    {
      $match: {
        tweetId: new mongoose.Types.ObjectId(tweetId),
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "commentId",
        as: "likes",
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
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        ownerDetails: 1,
        likeCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!comments)
    throw new ApiError(
      500,
      "something went wrong while fetching all the comments"
    );

  return res
    .status(200)
    .json(new ApiResponse(201, comments, "comments fetched successfully"));
});

const commentsOnComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) throw new ApiError(422, "commentId is required");
  if (!isValidObjectId(commentId))
    throw new ApiError(422, "commentId is not valid");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(409, "comment doesn't exists");

  const comments = await Comment.aggregate([
    {
      $match: {
        commentId: new mongoose.Types.ObjectId(commentId),
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
        foreignField: "commentId",
        as: "likes",
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: "$likes",
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
      },
    },

    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        ownerDetails: 1,
        likeCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!comments)
    throw new ApiError(500, "something went wrong while fetching the replies");

  return res
    .status(200)
    .json(new ApiResponse(201, comments, "replies fetched successfully"));
});

export {
  CommentOnTweet,
  commentOnComment,
  editComment,
  deleteComment,
  tweetComments,
  commentsOnComment,
};
