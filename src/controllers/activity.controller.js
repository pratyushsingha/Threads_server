import mongoose from "mongoose";
import { Activity } from "../../models/activity.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";
import { ApiError } from "../utils/ApiError.js";

const activityAggregation = () => {
  return [
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
        _id: 1,
        owner: 1,
        triggeredBy: 1,
        activityType: 1,
        createdAt: 1,
        tweetId: 1,
        pathId: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ];
};

const getActivities = asyncHandler(async (req, res) => {
  const { page, limit, filter } = req.query;
  
  const activityFilter = () => {
    if (filter === "all") {
      return {
        $in: ["like", "retweet", "reply", "follow"],
      };
    } else {
      return filter;
    }
  };

  const activityAggregate = Activity.aggregate([
    {
      $match: {
        notifiedUserId: new mongoose.Types.ObjectId(req.user._id),
        activityType: activityFilter(),
      },
    },
    ...activityAggregation(),
  ]);

  if (!activityAggregate) {
    throw new ApiError(500, "something went wrong while getting activities");
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

export { getActivities };
