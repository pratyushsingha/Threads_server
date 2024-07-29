import mongoose from "mongoose";
import { Activity } from "../../models/activity.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";

const getAllActivities = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const activityAggregate = Activity.aggregate([
    {
      $match: {
        notifiedUserId: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "notifiedUserId",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "triggeredBy",
        pipeline: [
          {
            $project: {
              _id: 1,
              avatar: 1,
              username: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$triggeredBy",
      },
    },
    {
      $unwind: {
        path: "$owner",
      },
    },
    {
      $project: {
        owner: 1,
        triggeredBy: 1,
        activityType: 1,
        createdAt: 1,
        tweetId: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  if (!activityAggregate) {
    return res
      .status(201)
      .json(new ApiResponse(200, [], "no activities found"));
  }

  const activities = await Activity.aggregatePaginate(
    activityAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "activityCount",
        docs: "activities",
      },
    })
  );

  return res
    .status(201)
    .json(new ApiResponse(200, activities, "activities fetched successfully"));
});

export { getAllActivities };
