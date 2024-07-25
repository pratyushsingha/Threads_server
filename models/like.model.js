import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const likeSchema = new Schema(
  {
    tweetId: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

likeSchema.plugin(mongooseAggregatePaginate);

export const Like = mongoose.model("Like", likeSchema);
