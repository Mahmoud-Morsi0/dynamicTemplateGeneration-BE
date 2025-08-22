import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export interface AppError extends Error {
    statusCode?: number
    isOperational?: boolean
}

export const errorHandler = (
    error: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Internal Server Error'

    logger.error('Error occurred:', {
        error: message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
    })

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    })
}

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
    })
}
