require('dotenv').config();
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const isEC2 = process.env.DB_HOST && !process.env.DATABASE_URL;
let pool;

if (isVercel) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10
  });
} else if (isEC2) {
  // EC2 / RDS - use standard pg driver
  const { Pool } = require('pg');
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.PGSSLMODE === 'no-verify' ? { rejectUnauthorized: false } : false,
    max: 10
  });
} else {
  // Local dev using Neon serverless wrapper for ISP bypass
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;

  // Always ensure sslmode=require for Neon connections
  let connectionString = process.env.DATABASE_URL ||
    `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`;
  if (!connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  pool = new Pool({ connectionString, max: 5 });
}

// Global debug listener
pool.on('connect', () => {
  console.log('✅ Connected to database');
});

pool.on('error', (err) => {
  console.error('❌ Connection dropped.', err.message);
});

module.exports = pool;
