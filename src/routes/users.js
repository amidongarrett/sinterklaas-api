'use strict';

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();

function serialize(doc) {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  obj.displayName = obj.name;
  delete obj._id;
  delete obj.name;
  if (obj.partnerId) obj.partnerId = obj.partnerId.toString();
  if (Array.isArray(obj.childrenIds)) {
    obj.childrenIds = obj.childrenIds.map((id) => id.toString());
  }
  return obj;
}

function isCastError(err) {
  return err instanceof mongoose.Error.CastError;
}

// PATCH /:userId — update displayName and/or email
router.patch('/:userId', async (req, res) => {
  const { displayName, email } = req.body;
  if (displayName === undefined && email === undefined) {
    return res.status(400).json({ error: 'At least one of displayName or email is required' });
  }

  try {
    const update = {};
    if (displayName !== undefined) update.name = displayName;
    if (email !== undefined) update.email = email;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json(serialize(user));
  } catch (err) {
    if (isCastError(err)) return res.status(404).json({ error: 'User not found' });
    throw err;
  }
});

// GET /:userId/partner — return linked partner or null
router.get('/:userId/partner', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.partnerId) return res.status(200).json(null);

    const partner = await User.findById(user.partnerId);
    if (!partner) return res.status(200).json(null);

    return res.status(200).json({ partnerId: partner._id.toString(), displayName: partner.name });
  } catch (err) {
    if (isCastError(err)) return res.status(404).json({ error: 'User not found' });
    throw err;
  }
});

// POST /:userId/partner/invite — link partner bidirectionally by email
router.post('/:userId/partner/invite', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Find or create partner user by email
    let partner = await User.findOne({ email });
    if (!partner) {
      partner = new User({ email, name: email, role: 'participant' });
      await partner.save();
    }

    if (partner._id.equals(user._id)) {
      return res.status(400).json({ error: 'Cannot link user as their own partner' });
    }

    // Unlink previous partners if needed
    if (user.partnerId && !user.partnerId.equals(partner._id)) {
      await User.findByIdAndUpdate(user.partnerId, { $set: { partnerId: null } });
    }
    if (partner.partnerId && !partner.partnerId.equals(user._id)) {
      await User.findByIdAndUpdate(partner.partnerId, { $set: { partnerId: null } });
    }

    // Set bidirectional link
    user.partnerId = partner._id;
    await user.save();
    await User.findByIdAndUpdate(partner._id, { $set: { partnerId: user._id } });

    return res.status(200).json(serialize(user));
  } catch (err) {
    if (isCastError(err)) return res.status(404).json({ error: 'User not found' });
    throw err;
  }
});

// DELETE /:userId/partner — unlink current partner bidirectionally
router.delete('/:userId/partner', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.partnerId) return res.status(404).json({ error: 'No partner linked' });

    await User.findByIdAndUpdate(user.partnerId, { $set: { partnerId: null } });
    user.partnerId = null;
    await user.save();

    return res.status(204).send();
  } catch (err) {
    if (isCastError(err)) return res.status(404).json({ error: 'User not found' });
    throw err;
  }
});

// POST /:userId/children — create a child user and attach to parent
router.post('/:userId/children', async (req, res) => {
  const { displayName, email } = req.body;
  if (!displayName) return res.status(400).json({ error: 'displayName is required' });

  try {
    const parent = await User.findById(req.params.userId);
    if (!parent) return res.status(404).json({ error: 'User not found' });

    const child = new User({ name: displayName, email: email || null, role: 'participant' });
    await child.save();

    parent.childrenIds.push(child._id);
    await parent.save();

    return res.status(201).json({
      id: child._id.toString(),
      displayName: child.name,
      email: child.email,
    });
  } catch (err) {
    if (isCastError(err)) return res.status(404).json({ error: 'User not found' });
    throw err;
  }
});

module.exports = router;
