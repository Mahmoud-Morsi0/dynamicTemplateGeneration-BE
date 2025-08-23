import { Router } from 'express'
import { AuthController } from './auth.controller'
import { authenticateToken } from '../../middleware/auth'

const router = Router()
const authController = new AuthController()

// Public routes
router.post('/register', (req, res) => authController.register(req, res))
router.post('/login', (req, res) => authController.login(req, res))

// Protected routes
router.get('/profile', authenticateToken, (req, res) => authController.getProfile(req, res))
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req, res))

export default router
