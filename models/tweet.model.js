import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const tweetSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // TODO: Add retweetId field
    tweetId: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    isTweet: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

tweetSchema.plugin(mongooseAggregatePaginate);

export const Tweet = mongoose.model("Tweet", tweetSchema);
