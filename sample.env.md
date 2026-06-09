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
