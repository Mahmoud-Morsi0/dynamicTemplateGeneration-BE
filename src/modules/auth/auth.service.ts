import { v4 as uuidv4 } from 'uuid'
import { eq } from 'drizzle-orm'
import { db } from '../../db/drizzle'
import { users, User, NewUser } from '../../db/schema'
import { hashPassword, comparePassword, generateToken } from '../../utils/auth'
import { logger } from '../../utils/logger'

export interface RegisterData {
    email: string
    name: string
    password: string
}

export interface LoginData {
    email: string
    password: string
}

export interface AuthResponse {
    user: {
        id: string
        email: string
        name: string
        createdAt: Date
    }
    token: string
}

export class AuthService {
    public async register(data: RegisterData): Promise<AuthResponse> {
        const { email, name, password } = data

        // Check if user already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1)

        if (existingUser.length > 0) {
            throw new Error('User already exists with this email')
        }

        // Hash password
        const passwordHash = await hashPassword(password)

        // Create user
        const newUser: NewUser = {
            id: uuidv4(),
            email: email.toLowerCase(),
            name,
            passwordHash
        }

        const [createdUser] = await db.insert(users).values(newUser).returning()

        if (!createdUser) {
            throw new Error('Failed to create user')
        }

        logger.info('New user registered', { userId: createdUser.id, email: createdUser.email })

        // Generate JWT token
        const token = generateToken(createdUser)

        return {
            user: {
                id: createdUser.id,
                email: createdUser.email,
                name: createdUser.name,
                createdAt: createdUser.createdAt
            },
            token
        }
    }

    public async login(data: LoginData): Promise<AuthResponse> {
        const { email, password } = data

        // Find user by email
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1)

        if (!user) {
            throw new Error('Invalid email or password')
        }

        // Check password
        const isPasswordValid = await comparePassword(password, user.passwordHash)
        if (!isPasswordValid) {
            throw new Error('Invalid email or password')
        }

        logger.info('User logged in', { userId: user.id, email: user.email })

        // Generate JWT token
        const token = generateToken(user)

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt
            },
            token
        }
    }

    public async getUserById(userId: string): Promise<User | null> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)

        return user || null
    }

    public async getUserProfile(userId: string): Promise<{ id: string; email: string; name: string; createdAt: Date } | null> {
        const user = await this.getUserById(userId)
        if (!user) return null

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt
        }
    }
}
