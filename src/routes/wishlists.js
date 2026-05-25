'use strict';

const express = require('express');
const mongoose = require('mongoose');
const WishlistItem = require('../models/WishlistItem');
const { PLACEHOLDER_USER_ID } = require('../constants/placeholderUser');

const router = express.Router();

function serialize(doc) {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  return obj;
}

async function findItem(userId, itemId, res) {
  try {
    const item = await WishlistItem.findOne({ _id: itemId, ownerId: userId });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return null;
    }
    return item;
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      res.status(404).json({ error: 'Item not found' });
      return null;
    }
    throw err;
  }
}

// POST /:userId/items — add item
router.post('/:userId/items', async (req, res) => {
  const { name, description, links } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const item = new WishlistItem({
    ownerId: req.params.userId,
    ownerType: 'user',
    name,
    description: description ?? null,
    links: links ?? [],
  });
  await item.save();

  return res.status(201).json(serialize(item));
});

// GET /:userId — list all items for a user
router.get('/:userId', async (req, res) => {
  const docs = await WishlistItem.find({ ownerId: req.params.userId });
  return res.status(200).json({ items: docs.map(serialize) });
});

// PATCH /:userId/items/:itemId — update fields
router.patch('/:userId/items/:itemId', async (req, res) => {
  const item = await findItem(req.params.userId, req.params.itemId, res);
  if (!item) return;

  for (const key of ['name', 'description', 'links']) {
    if (key in req.body) {
      item[key] = req.body[key];
    }
  }
  await item.save();

  return res.status(200).json(serialize(item));
});

// DELETE /:userId/items/:itemId — delete item
router.delete('/:userId/items/:itemId', async (req, res) => {
  const item = await findItem(req.params.userId, req.params.itemId, res);
  if (!item) return;

  await item.deleteOne();
  return res.status(204).send();
});

// POST /:userId/items/:itemId/claim — claim an item
router.post('/:userId/items/:itemId/claim', async (req, res) => {
  const item = await findItem(req.params.userId, req.params.itemId, res);
  if (!item) return;

  if (item.claimedBy !== null) {
    return res.status(409).json({ error: 'Item already claimed' });
  }

  item.claimedBy = PLACEHOLDER_USER_ID;
  item.claimedAt = new Date();
  await item.save();

  return res.status(200).json(serialize(item));
});

// POST /:userId/items/:itemId/unclaim — release a claim
router.post('/:userId/items/:itemId/unclaim', async (req, res) => {
  const item = await findItem(req.params.userId, req.params.itemId, res);
  if (!item) return;

  if (item.claimedBy !== PLACEHOLDER_USER_ID) {
    return res.status(409).json({ error: 'Item not claimed by you' });
  }

  item.claimedBy = null;
  item.claimedAt = null;
  await item.save();

  return res.status(200).json(serialize(item));
});

module.exports = router;
