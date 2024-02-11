import { Comment } from "../../models/comment.model.js";
import { Tweet } from "../../models/tweet.model.js";
import { APiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const CommentOnTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!tweetId) throw new APiError(400, "tweet id is missing");

  const tweetExists = await Tweet.findById(tweetId);
  if (!tweetExists) throw new APiError(400, "tweet doesn't exists");

  const commentedTweet = await Comment.create({
    tweetId,
    content,
    owner: req.user?._id,
  });
  if (!commentedTweet)
    throw new APiError(
      500,
      "something went wrong while commenting on this tweet"
    );

  return res.status(200).json(new ApiResponse(201, "commented successfully"));
});

const commentOnComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) throw new APiError(400, "comment id is missing");

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new APiError(400, "comment doesn't exists");

  const commentedComment = await Comment.create({
    commentId,
    content,
    owner: req.user?._id,
  });
  if (!commentedComment) throw new APiError(500, "unable to comment");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "commented successfully"));
});

const editComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) throw new APiError(400, "comment id is missing");

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new APiError(400, "comment doesn't exists");

  const verifyUser =
    commentExists.owner.toString() === req.user?._id.toString();
  verifyUser;
  if (!verifyUser) throw new APiError(400, "unathorized edit");

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { $set: { content } },
    { new: true }
  );

  if (!updatedComment)
    throw new APiError(500, "something went wrong while updating the tweet");

  return res
    .status(200)
    .json(new ApiResponse(201, {}, "comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) throw new APiError(400, "comment id is missing");

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new APiError(400, "comment doesn't exists");

  const verifyUser =
    commentExists.owner.toString() === req.user?._id.toString();
  console.log(verifyUser);
  if (!verifyUser) throw new APiError(400, "unathorized edit");

  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) throw new APiError(500, "unable to delete the comment");

  return res.status(200).json(201, {}, "comment deleted successfully");
});

export { CommentOnTweet, commentOnComment, editComment, deleteComment };
