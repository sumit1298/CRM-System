# Deployment Guide

This guide covers deploying your AI CRM system to production.

## Prerequisites

- MongoDB Atlas account (already configured)
- API keys: Google Gemini API, OpenAI API (for AI service)
- Deployment platform (Vercel, Render, Railway, or Heroku)
- Git repository (GitHub, GitLab, or Bitbucket)

## Environment Configuration

### Backend (.env)

Required variables:
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm_production
JWT_SECRET=<generate-strong-random-secret>
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=<your-gemini-api-key>
CLIENT_URL=https://your-frontend-domain.com
NODE_ENV=production
```

**Generating JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (.env.production)

```
VITE_API_URL=https://your-api-domain.com/api
```

### AI Service (.env)

Required variables:
```
AI_SERVICE_PORT=8000
AI_PROVIDER=openai  # or gemini
OPENAI_API_KEY=<your-openai-api-key>
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm_ai_production
NODE_ENV=production
```

## Deployment Steps

### Option 1: Vercel (Recommended for Frontend)

Frontend is already configured with `vercel.json`:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://your-api-domain.com/api
```

### Option 2: Render (Recommended for Full Stack)

#### Deploy Backend

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repository
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** Add all variables from `.env`
6. Deploy

#### Deploy AI Service

1. Create new Web Service
2. Select Python environment
3. Configure:
   - **Build Command:** `pip install -r ai_service/requirements.txt`
   - **Start Command:** `cd ai_service && uvicorn app.main:app --host 0.0.0.0`
   - **Environment Variables:** Add all variables from `.env`
4. Deploy

#### Deploy Frontend

1. Create new Static Site
2. Select frontend folder
3. Configure:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Environment Variables:** Add VITE_API_URL
4. Deploy

### Option 3: Docker (For any platform)

#### Backend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src
EXPOSE 5000
CMD ["node", "src/server.js"]
```

#### AI Service Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY ai_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ai_service/app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

## Security Checklist

- [ ] All sensitive variables are set in production platform (not in .env files)
- [ ] MongoDB Atlas has production server IP whitelisted
- [ ] JWT_SECRET is strong (32+ characters, random)
- [ ] CORS is configured with your production domain only
- [ ] HTTPS/SSL is enabled on all endpoints
- [ ] Rate limiting is active (100 requests/15min per IP)
- [ ] Error messages don't expose sensitive information (NODE_ENV=production)
- [ ] Database backups are configured
- [ ] Monitoring/alerting is set up (Sentry, LogRocket, etc.)

## MongoDB Production Setup

```bash
# Whitelist production server IP in MongoDB Atlas
# 1. Go to Security > Network Access
# 2. Add IP address of your production server

# Enable encryption at rest
# 1. Go to Security > Encryption at Rest
# 2. Enable automatic encryption

# Set up backup
# 1. Go to Backup > Configure Backup Settings
# 2. Enable automated daily backups
```

## Health Checks

After deployment, verify all services:

```bash
# Backend health
curl https://your-api-domain.com/health

# AI Service health
curl https://your-ai-domain.com/health

# Frontend - should load in browser
https://your-frontend-domain.com

# API functionality
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

## Database Backup & Recovery

### Automated Backups
MongoDB Atlas provides automated backups. Check settings in Atlas dashboard under "Backup".

### Manual Backup

```bash
mongodump \
  --uri="mongodb+srv://username:password@cluster.mongodb.net/crm_production" \
  --out=./backups/crm_backup_$(date +%Y%m%d_%H%M%S)
```

### Restore from Backup

```bash
mongorestore \
  --uri="mongodb+srv://username:password@cluster.mongodb.net/crm_production" \
  --dir=./backups/crm_backup_YYYYMMDD_HHMMSS
```

## Monitoring & Logging

### Recommended Services

1. **Error Tracking:** Sentry, Rollbar
2. **Logging:** LogRocket, Datadog, New Relic
3. **Performance:** New Relic, Datadog, Elastic
4. **Uptime Monitoring:** UptimeRobot, Pingdom

### Basic Application Logging

Backend logs are already configured via Morgan (dev mode) and error handler.

To add persistent logging:

```bash
npm install winston
```

Then configure Winston in your backend for production logging.

## Scaling Strategy

1. **Database:** MongoDB Atlas auto-scaling
2. **Backend:** Enable horizontal scaling in Render/Railway (creates multiple instances)
3. **Frontend:** Static hosting on CDN (Vercel/Netlify does this automatically)
4. **AI Service:** Consider GPU instances if needed for large-scale inference

## Rollback Strategy

```bash
# Render automatically keeps deployment history
# Go to Dashboard > Environment > Deployments
# Select previous version and click "Deploy"

# Or rollback via git
git revert <commit-hash>
git push
```

## Support & Troubleshooting

- Check service health endpoints
- Review application logs in deployment platform
- Check MongoDB Atlas metrics
- Verify environment variables are set correctly
- Ensure IP whitelisting is configured in MongoDB Atlas

---

**Last Updated:** 2026-09-01
**Next Review:** Before each production deployment
