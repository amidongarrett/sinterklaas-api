'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const OtpSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
}, { versionKey: false });

OtpSchema.index({ userId: 1, used: 1 });

module.exports = mongoose.model('Otp', OtpSchema);
