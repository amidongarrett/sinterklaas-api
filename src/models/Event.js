'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventSchema = new Schema({
  name:           { type: String, required: true },
  year:           { type: Number, required: true },
  status:         { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
  participantIds: { type: [Schema.Types.ObjectId], default: [] },
  assignments:    { type: Array, default: [] },
  createdBy:      { type: String, required: true },
  createdAt:      { type: Date, default: Date.now },
}, { versionKey: false });

module.exports = mongoose.model('Event', EventSchema);
