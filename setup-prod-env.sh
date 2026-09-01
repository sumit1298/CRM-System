#!/bin/bash

# Production Environment Setup Script
# This script generates secure production environment files

echo "🔐 AI CRM - Production Environment Setup"
echo "======================================="
echo ""

# Function to generate secure random string
generate_secret() {
  if command -v openssl &> /dev/null; then
    openssl rand -hex 32
  elif command -v python3 &> /dev/null; then
    python3 -c "import secrets; print(secrets.token_hex(32))"
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

# Backend Configuration
echo "📋 Backend Configuration (.env)"
echo "================================"
read -p "Enter MongoDB URI (mongodb+srv://...): " MONGODB_URI
read -p "Enter Gemini API Key: " GEMINI_API_KEY
read -p "Enter Frontend Domain URL (e.g., https://crm.example.com): " CLIENT_URL
read -p "Enter Backend Port (default 5000): " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-5000}

JWT_SECRET=$(generate_secret)

cat > backend/.env << EOF
PORT=$BACKEND_PORT
MONGODB_URI=$MONGODB_URI
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=$GEMINI_API_KEY
CLIENT_URL=$CLIENT_URL
NODE_ENV=production
EOF

echo "✅ Created backend/.env"
echo "   JWT_SECRET: $JWT_SECRET"
echo ""

# AI Service Configuration
echo "📋 AI Service Configuration (.env)"
echo "===================================="
read -p "Enter AI Provider (openai or gemini, default: openai): " AI_PROVIDER
AI_PROVIDER=${AI_PROVIDER:-openai}

if [ "$AI_PROVIDER" = "openai" ]; then
  read -p "Enter OpenAI API Key: " OPENAI_API_KEY
  OPENAI_API_KEY_CONFIG="OPENAI_API_KEY=$OPENAI_API_KEY"
else
  OPENAI_API_KEY_CONFIG="# Using Gemini instead"
fi

read -p "Enter AI Service Port (default 8000): " AI_SERVICE_PORT
AI_SERVICE_PORT=${AI_SERVICE_PORT:-8000}

cat > ai_service/.env << EOF
AI_SERVICE_PORT=$AI_SERVICE_PORT
AI_PROVIDER=$AI_PROVIDER
$OPENAI_API_KEY_CONFIG
MONGODB_URI=$MONGODB_URI
NODE_ENV=production
ENABLE_LANGCHAIN=false
EOF

echo "✅ Created ai_service/.env"
echo ""

# Frontend Configuration
echo "📋 Frontend Configuration (.env.production)"
echo "============================================"
read -p "Enter API Domain URL (e.g., https://api.example.com): " API_URL

cat > frontend/.env.production << EOF
VITE_API_URL=$API_URL/api
EOF

echo "✅ Created frontend/.env.production"
echo ""

# Summary
echo "🎉 Production Environment Setup Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. ✅ Copy .env files to your production servers (keep them out of git)"
echo "2. ✅ Update MongoDB Atlas network access with your production server IPs"
echo "3. ✅ Deploy backend:   cd backend && npm ci && npm start"
echo "4. ✅ Deploy AI service: cd ai_service && pip install -r requirements.txt && uvicorn app.main:app"
echo "5. ✅ Deploy frontend:   cd frontend && npm ci && npm run build"
echo ""
echo "⚠️  Security Reminders:"
echo "   - Never commit .env files to git"
echo "   - Keep JWT_SECRET secret and strong"
echo "   - Rotate API keys regularly"
echo "   - Use HTTPS in production (CLIENT_URL and API_URL)"
echo "   - Whitelist production IPs in MongoDB Atlas"
echo ""
