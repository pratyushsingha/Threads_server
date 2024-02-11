import mongoose, { Schema } from "mongoose";

const followSchema = new Schema({
  follower: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

export const Follow = mongoose.model("Follow", followSchema);
