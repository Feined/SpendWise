import { config } from '../config/index.js';

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[SpendWise Error]', err);

  // Zod schema validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token',
    });
  }

  // Explicit unauthorized errors
  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Please sign in.',
    });
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      success: false,
      error: `A unique constraint was violated (${target}).`,
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Resource not found',
    });
  }

  // Prisma foreign key constraint violation
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: 'Invalid relationship or referenced record does not exist',
    });
  }

  // JSON syntax errors in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body',
    });
  }

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  // In production, do not leak internal 500 database/code exceptions
  const message =
    statusCode >= 500 && config.nodeEnv === 'production'
      ? 'An unexpected internal error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

