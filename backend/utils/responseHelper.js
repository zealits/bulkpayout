// Success response helper
const successResponse = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

// Error response helper
const errorResponse = (res, message = "Internal Server Error", statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Validation error response
const validationErrorResponse = (res, errors, message = "Validation failed") => {
  return res.status(400).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

// Paginated response helper
const paginatedResponse = (res, data, totalCount, page, limit, message = "Success") => {
  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
};
