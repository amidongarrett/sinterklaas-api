'use strict';

require('dotenv').config();

const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const { connectDB } = require('./db');
const groupsRouter = require('./routes/groups');
const wishlistsRouter = require('./routes/wishlists');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const { transporter } = require('./lib/email');
// Side-effect: register Invitation model with Mongoose before any query runs
require('./models/Invitation');

async function main() {
  const REQUIRED_ENV_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'JWT_SECRET', 'MONGODB_URI'];
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length) {
    console.error(
      `Server startup aborted. Missing required environment variables: ${missing.join(', ')}\n` +
      'Set them in your environment (or Render dashboard) and restart.'
    );
    process.exit(1);
  }

  await connectDB();

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const corsOptions = { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true };
  app.options('*', cors(corsOptions));   // handle all OPTIONS preflight requests
  app.use(cors(corsOptions));            // attach CORS headers to every response
  app.use('/api/auth', authRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/wishlists', wishlistsRouter);
  app.use('/api/users', usersRouter);

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    transporter.verify()
      .then(() => console.log('SMTP connection verified'))
      .catch((err) => console.warn('SMTP connection check failed (server will still run):', err.message));
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
