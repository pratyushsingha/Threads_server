import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const repostSchema = new Schema(
  {
    tweetId: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isTweet: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

repostSchema.plugin(mongooseAggregatePaginate);

export const Repost = mongoose.model("Repost", repostSchema);
