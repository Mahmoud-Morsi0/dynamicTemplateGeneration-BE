import { logger } from './logger'

class KeepAliveManager {
    private interval: NodeJS.Timeout | null = null
    private isActive = false

    public start() {
        if (this.isActive || process.env.NODE_ENV !== 'production') {
            return
        }

        // Only run in serverless environment
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
        if (!isServerless) {
            return
        }

        this.isActive = true
        logger.info('Starting keep-alive mechanism for serverless environment')

        // Keep the function warm by doing minimal work every 4 minutes
        this.interval = setInterval(() => {
            try {
                // Minimal database operation to keep connection alive
                const timestamp = new Date().toISOString()
                logger.debug(`Keep-alive ping: ${timestamp}`)
                
                // You could add a minimal database query here if needed
                // For now, just log to keep the function active
            } catch (error) {
                logger.warn('Keep-alive ping failed:', error)
            }
        }, 4 * 60 * 1000) // 4 minutes

        logger.info('Keep-alive mechanism started (4-minute intervals)')
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
            this.isActive = false
            logger.info('Keep-alive mechanism stopped')
        }
    }

    public getStatus() {
        return {
            active: this.isActive,
            interval: this.interval ? '4 minutes' : null
        }
    }
}

export const keepAliveManager = new KeepAliveManager()

// Auto-start in serverless environments
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    keepAliveManager.start()
}
