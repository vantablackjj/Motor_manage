const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const sendError = (res, message, statusCode = 500, details = {}) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

const sendPaginated = (res, data, pagination, message = "Success") => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
