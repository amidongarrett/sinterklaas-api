'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const InvitationSchema = new Schema({
  email:      { type: String, default: null },
  eventId:    { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  token:      { type: String, required: true, unique: true },
  expiresAt:  { type: Date, required: true },
  acceptedAt: { type: Date, default: null },
  createdAt:  { type: Date, default: Date.now },
}, { versionKey: false });

module.exports = mongoose.model('Invitation', InvitationSchema);
