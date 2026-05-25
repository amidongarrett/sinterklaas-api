'use strict';

require('dotenv').config();

const express = require('express');
const { connectDB } = require('./db');
const groupsRouter = require('./routes/groups');
const wishlistsRouter = require('./routes/wishlists');

async function main() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use('/api/groups', groupsRouter);
  app.use('/api/wishlists', wishlistsRouter);

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
