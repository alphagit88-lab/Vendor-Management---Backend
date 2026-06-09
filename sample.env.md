# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=binrental_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Stripe (hardware shop + one-time subscription checkout)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
# Webhook endpoint: POST /api/stripe/webhook
# Stripe CLI: stripe listen --forward-to localhost:5000/api/stripe/webhook

# Infobip SMS (password reset OTP)
INFOBIP_API_KEY=your_infobip_api_key_here
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_SENDER=SuperVendor
INFOBIP_DEFAULT_COUNTRY_CODE=1
OTP_EXPIRY_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
PASSWORD_RESET_TOKEN_EXPIRES_IN=15m
# SMS_LOG_ONLY=true
