'use strict';

const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true },
    ownerType: { type: String, required: true, enum: ['user'], default: 'user' },
    name: { type: String, required: true },
    description: { type: String, default: null },
    links: { type: [String], default: [] },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('WishlistItem', wishlistItemSchema);
