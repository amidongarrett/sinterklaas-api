'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  email:       { type: String, default: null },
  name:        { type: String, required: true },
  role:        { type: String, enum: ['admin', 'participant'], default: 'participant' },
  partnerId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  childrenIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  createdAt:   { type: Date, default: Date.now },
}, { versionKey: false });

module.exports = mongoose.model('User', UserSchema);
