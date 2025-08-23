import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { logger } from '../../utils/logger'
import { z } from 'zod'

const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters')
})

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
})

export class AuthController {
    private authService: AuthService

    constructor() {
        this.authService = new AuthService()
    }

    public async register(req: Request, res: Response): Promise<void> {
        try {
            const validatedData = registerSchema.parse(req.body)

            const result = await this.authService.register(validatedData)

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result
            })
        } catch (error) {
            logger.error('Registration error:', error)

            if (error instanceof z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                })
                return
            }

            if (error instanceof Error && error.message === 'User already exists with this email') {
                res.status(409).json({
                    error: error.message
                })
                return
            }

            res.status(500).json({
                error: 'Failed to register user',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    public async login(req: Request, res: Response): Promise<void> {
        try {
            const validatedData = loginSchema.parse(req.body)

            const result = await this.authService.login(validatedData)

            res.json({
                success: true,
                message: 'Login successful',
                data: result
            })
        } catch (error) {
            logger.error('Login error:', error)

            if (error instanceof z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                })
                return
            }

            if (error instanceof Error && error.message === 'Invalid email or password') {
                res.status(401).json({
                    error: error.message
                })
                return
            }

            res.status(500).json({
                error: 'Failed to login',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    public async getProfile(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'User not authenticated' })
                return
            }

            const profile = await this.authService.getUserProfile(req.user.userId)

            if (!profile) {
                res.status(404).json({ error: 'User not found' })
                return
            }

            res.json({
                success: true,
                data: profile
            })
        } catch (error) {
            logger.error('Get profile error:', error)
            res.status(500).json({
                error: 'Failed to get user profile',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    public async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'User not authenticated' })
                return
            }

            const user = await this.authService.getUserById(req.user.userId)

            if (!user) {
                res.status(404).json({ error: 'User not found' })
                return
            }

            const { generateToken } = await import('../../utils/auth')
            const token = generateToken(user)

            res.json({
                success: true,
                data: { token }
            })
        } catch (error) {
            logger.error('Refresh token error:', error)
            res.status(500).json({
                error: 'Failed to refresh token',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }
}
