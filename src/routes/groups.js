'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { PLACEHOLDER_USER_ID } = require('../constants/placeholderUser');

const router = express.Router();

function serialize(doc) {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  return obj;
}

router.post('/', async (req, res) => {
  const { name, year } = req.body;
  if (!name || !year) {
    return res.status(400).json({ error: 'name and year are required' });
  }

  const event = new Event({ name, year, createdBy: PLACEHOLDER_USER_ID });
  await event.save();

  return res.status(201).json(serialize(event));
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Group not found' });
    }
    return res.status(200).json(serialize(event));
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: 'Group not found' });
    }
    throw err;
  }
});

module.exports = router;
