'use strict';

require('dotenv').config();

const cors = require('cors');
const express = require('express');
const { connectDB } = require('./db');
const groupsRouter = require('./routes/groups');
const wishlistsRouter = require('./routes/wishlists');
const usersRouter = require('./routes/users');
// Side-effect: register Invitation model with Mongoose before any query runs
require('./models/Invitation');

async function main() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
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
