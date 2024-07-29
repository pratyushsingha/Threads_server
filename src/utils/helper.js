import mongoose from "mongoose";
/**
 *
 * @param {{page: number; limit: number; customLabels: mongoose.CustomLabels;}} options
 * @returns {mongoose.PaginateOptions}
 */
export const getMongoosePaginationOptions = ({
  page = 1,
  limit = 20,
  customLabels,
}) => {
  return {
    page: Math.max(page, 1),
    limit: Math.max(limit, 1),
    pagination: true,
    customLabels: {
      pagingCounter: "serialNumberStartFrom",
      ...customLabels,
    },
  };
};

export const getPusherActivityOptions = (activityType, req, pathId) => {
  return {
    activityType,
    triggeredBy: {
      _id: req.user._id,
      username: req.user.username,
      avatar: req.user.avatar,
    },
    pathId,
    createdAt: Date.now(),
  };
};
