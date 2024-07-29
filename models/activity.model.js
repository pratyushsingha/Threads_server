import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const activitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notifiedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    activityType: {
      type: String,
      enum: [
        "liked",
        "disliked",
        "replied",
        "reposted",
        "followed",
        "unfollowed",
      ],
      required: true,
    },
    pathId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.plugin(mongooseAggregatePaginate);

export const Activity = mongoose.model("Activity", activitySchema);
