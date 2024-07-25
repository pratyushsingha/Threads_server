import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    isAnonymous: {
      type: Boolean,
      default: false,
      required: true,
    },
    tweetId: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
