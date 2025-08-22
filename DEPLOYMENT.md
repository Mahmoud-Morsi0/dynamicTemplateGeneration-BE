# Vercel Deployment Guide

## Overview
This Node.js/Express backend is configured for deployment on Vercel as a serverless function.

## Configuration Files
- `vercel.json` - Vercel deployment configuration
- `package.json` - Added `vercel-build` script for Vercel

## Environment Variables
Set these in your Vercel project settings:

### Required
- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-frontend-domain.com`

### Database & Storage (Production Considerations)
⚠️ **Important**: SQLite and local file storage don't work well with Vercel's serverless architecture.

**For Production, Consider:**

### Database Options:
1. **Turso** - SQLite-compatible, serverless-friendly
2. **PlanetScale** - MySQL-compatible 
3. **Neon** - PostgreSQL-compatible
4. **Supabase** - PostgreSQL with additional features

### File Storage Options:
1. **Vercel Blob** - Vercel's file storage solution
2. **AWS S3** - Most popular object storage
3. **Cloudinary** - Image/document management
4. **UploadThing** - Developer-friendly file uploads

## Deployment Steps

1. **Push your code to GitHub/GitLab**
2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
3. **Configure Environment Variables:**
   - Add the required environment variables in Vercel dashboard
4. **Deploy:**
   - Vercel will automatically build and deploy

## API Endpoints
After deployment, your API will be available at:
- `https://your-project.vercel.app/health` - Health check
- `https://your-project.vercel.app/api/templates/*` - Template endpoints

## Testing Deployment
```bash
# Test health endpoint
curl https://your-project.vercel.app/health

# Expected response:
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

## Common Issues & Solutions

### 1. CORS Errors
- Make sure `CORS_ORIGIN` is set to your frontend domain
- Check that your frontend domain is correct (including https://)

### 2. Database Issues
- SQLite files are ephemeral on Vercel
- Consider migrating to a cloud database for production

### 3. File Storage Issues  
- Local `storage/` directory doesn't persist on Vercel
- Use cloud storage solutions for uploaded files

### 4. Build Failures
- Ensure all dependencies are in `package.json`
- Check that TypeScript compiles without errors locally

## Local Development
```bash
npm install
npm run dev
```

The server will run on http://localhost:4000
