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
// Side-effect: register Invitation model with Mongoose before any query runs
require('./models/Invitation');

async function main() {
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
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
