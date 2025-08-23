# Rate Limit Configuration

## Overview
The application uses configurable rate limits to prevent abuse and ensure fair usage. Rate limits are automatically adjusted based on the environment (development vs production).

## Current Configuration

### Development Environment
- **API Requests**: 500 requests per 15 minutes
- **File Uploads**: 200 uploads per 15 minutes  
- **Authentication**: 100 attempts per 15 minutes

### Production Environment
- **API Requests**: 100 requests per 15 minutes
- **File Uploads**: 50 uploads per 15 minutes
- **Authentication**: 20 attempts per 15 minutes

## Configuration File
Rate limits are configured in `src/config/rateLimit.ts`:

```typescript
export const rateLimitConfig = {
    api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: env.NODE_ENV === 'development' ? 500 : 100,
    },
    upload: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: env.NODE_ENV === 'development' ? 200 : 50,
    },
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: env.NODE_ENV === 'development' ? 100 : 20,
    }
}
```

## How to Adjust Rate Limits

### For Development
If you need higher limits during development, modify the values in `src/config/rateLimit.ts`:

```typescript
// Increase development limits
api: {
    max: env.NODE_ENV === 'development' ? 1000 : 100, // Increased from 500
},
upload: {
    max: env.NODE_ENV === 'development' ? 500 : 50,   // Increased from 200
}
```

### For Production
To adjust production limits, modify the second value in each configuration:

```typescript
// Increase production limits
api: {
    max: env.NODE_ENV === 'development' ? 500 : 200,  // Increased from 100
},
upload: {
    max: env.NODE_ENV === 'development' ? 200 : 100,  // Increased from 50
}
```

### Temporary Override
For testing, you can temporarily disable rate limits by commenting out the middleware in `src/server.ts`:

```typescript
// Comment out to disable rate limiting temporarily
// app.use('/api/templates', templatesRateLimiter, templatesRouter)
```

## Rate Limit Headers
The application includes standard rate limit headers in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Error Messages
When rate limits are exceeded, the API returns:
```json
{
  "error": "Too many uploads from this IP, please try again later."
}
```

## Monitoring
Rate limit usage is logged by the express-rate-limit middleware. Check your server logs to monitor usage patterns.

## Best Practices
1. **Development**: Use higher limits for testing
2. **Production**: Start with conservative limits and adjust based on usage
3. **Monitoring**: Watch for rate limit errors in production logs
4. **User Experience**: Provide clear error messages when limits are hit
