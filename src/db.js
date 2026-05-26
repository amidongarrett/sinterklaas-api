'use strict';

const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const { PLACEHOLDER_USER_OID } = require('./constants/placeholderUser');
const { PLACEHOLDER_GROUP_OID } = require('./constants/placeholderGroup');

async function seedPlaceholders() {
  await User.findByIdAndUpdate(
    PLACEHOLDER_USER_OID,
    { $setOnInsert: { name: 'Admin', email: 'admin@example.com', role: 'admin', childrenIds: [] } },
    { upsert: true }
  );
  await Event.findByIdAndUpdate(
    PLACEHOLDER_GROUP_OID,
    { $setOnInsert: { name: 'Sinterklaas 2026', year: 2026, status: 'active', participantIds: [], assignments: [], createdBy: PLACEHOLDER_USER_OID } },
    { upsert: true }
  );
  console.log('Placeholder documents seeded');
}

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await seedPlaceholders();
}

module.exports = { connectDB };
