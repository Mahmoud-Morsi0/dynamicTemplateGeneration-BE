import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '../config/env'
import { User } from '../db/schema'

export interface JWTPayload {
    userId: string
    email: string
    name: string
}

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(12)
    return bcrypt.hash(password, salt)
}

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (user: User): string => {
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        name: user.name
    }

    return jwt.sign(payload, env.JWT_SECRET as string, {
        expiresIn: env.JWT_EXPIRES_IN
    } as SignOptions)
}

export const verifyToken = (token: string): JWTPayload => {
    try {
        return jwt.verify(token, env.JWT_SECRET as string) as JWTPayload
    } catch (error) {
        throw new Error('Invalid or expired token')
    }
}

export const extractTokenFromHeader = (authHeader?: string): string | null => {
    if (!authHeader) return null

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null
    }

    return parts[1] || null
}
