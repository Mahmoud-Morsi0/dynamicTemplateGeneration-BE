# Deployment Checklist

## Pre-Deployment

- [ ] **Build Test**: Run `npm run build` locally to ensure no TypeScript errors
- [ ] **Tests Pass**: Run `npm test` to ensure all tests pass
- [ ] **Environment Variables**: Copy values from `env.production.example` to Vercel dashboard

## Vercel Configuration

### Required Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
- [ ] `JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long`

### Optional Environment Variables
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `LOG_LEVEL=info`
- [ ] `MAX_UPLOAD_MB=10`

## Production Considerations

### Database
- [ ] **SQLite Warning**: Current setup uses SQLite which doesn't persist on Vercel
- [ ] **Cloud Database**: Consider migrating to Turso, PlanetScale, Neon, or Supabase
- [ ] **Database URL**: Update `DB_URL` environment variable if using cloud database

### File Storage
- [ ] **Local Storage Warning**: Current setup uses local file storage which doesn't persist
- [ ] **Cloud Storage**: Consider using Vercel Blob, AWS S3, or Cloudinary
- [ ] **Storage Config**: Update storage configuration if using cloud storage

### Security
- [ ] **JWT Secret**: Use a strong, unique JWT secret (at least 32 characters)
- [ ] **CORS Origin**: Set to your actual frontend domain
- [ ] **Rate Limits**: Production rate limits are automatically applied

## Post-Deployment Testing

- [ ] **Health Check**: Test `https://your-project.vercel.app/health`
- [ ] **Authentication**: Test user registration and login
- [ ] **File Upload**: Test template upload and inspection
- [ ] **CORS**: Test API calls from your frontend domain

## Deployment Commands

```bash
# Local testing
npm install
npm run build
npm test

# Deploy to Vercel (after connecting repository)
git add .
git commit -m "Configure for production deployment"
git push origin main
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check `CORS_ORIGIN` environment variable
2. **Database Errors**: SQLite doesn't work on Vercel - use cloud database
3. **File Upload Errors**: Local storage doesn't persist - use cloud storage
4. **Build Errors**: Run `npm run build` locally first

### Logs
- Check Vercel function logs in the Vercel dashboard
- Use `LOG_LEVEL=debug` for more detailed logging (development only)
