'use strict';

const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
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

// GET /:groupId/members — list all members of an event
router.get('/:groupId/members', async (req, res) => {
  try {
    const event = await Event.findById(req.params.groupId);
    if (!event) return res.status(404).json({ error: 'Group not found' });

    const users = await User.find({ _id: { $in: event.participantIds } });
    const members = users.map((u) => ({
      userId: u._id.toString(),
      displayName: u.name,
      email: u.email,
    }));
    return res.status(200).json({ members });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: 'Group not found' });
    }
    throw err;
  }
});

// POST /:groupId/invite — generate an invitation token
router.post('/:groupId/invite', async (req, res) => {
  try {
    const event = await Event.findById(req.params.groupId);
    if (!event) return res.status(404).json({ error: 'Group not found' });

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = new Invitation({
      email: req.body.email || null,
      eventId: event._id,
      token,
      expiresAt,
    });
    await invitation.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.status(201).json({ inviteUrl: `${frontendUrl}/join?token=${token}` });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: 'Group not found' });
    }
    throw err;
  }
});

// DELETE /:groupId/members/:userId — remove a member from the event
router.delete('/:groupId/members/:userId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.groupId);
    if (!event) return res.status(404).json({ error: 'Group not found' });

    await Event.findByIdAndUpdate(req.params.groupId, {
      $pull: { participantIds: req.params.userId },
    });
    return res.status(204).send();
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: 'Group not found' });
    }
    throw err;
  }
});

// POST /:groupId/draw — run the Secret-Sinterklaas shuffle and persist
router.post('/:groupId/draw', async (req, res) => {
  try {
    const event = await Event.findById(req.params.groupId);
    if (!event) return res.status(404).json({ error: 'Group not found' });

    // Load all users in the event
    const allUsers = await User.find({ _id: { $in: event.participantIds } });

    // Determine which user ids are children (appear in some parent's childrenIds)
    const childIdSet = new Set();
    allUsers.forEach((u) => {
      u.childrenIds.forEach((cid) => childIdSet.add(cid.toString()));
    });

    const adults = allUsers.filter((u) => !childIdSet.has(u._id.toString()));

    if (adults.length < 2) {
      return res.status(422).json({ error: 'Not enough adult participants to draw names' });
    }

    // Build couples: pairs where both users point to each other as partner
    const adultMap = new Map(adults.map((u) => [u._id.toString(), u]));
    const assignedToCouple = new Set();
    const couples = [];

    adults.forEach((u) => {
      const uid = u._id.toString();
      if (assignedToCouple.has(uid)) return;

      if (u.partnerId) {
        const pid = u.partnerId.toString();
        const partner = adultMap.get(pid);
        if (partner && partner.partnerId && partner.partnerId.toString() === uid) {
          couples.push([u, partner]);
          assignedToCouple.add(uid);
          assignedToCouple.add(pid);
          return;
        }
      }
      couples.push([u]);
      assignedToCouple.add(uid);
    });

    // Fisher-Yates shuffle helper
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Each couple/singleton assigns 4 names total (2 per person for couples, 4 for singletons).
    // Constraint: no intra-couple assignments; each adult name appears on exactly 2 different
    // couples' lists.
    // Strategy: build a flat list of (giverId, receiverId) pairs via round-robin with retries.
    const MAX_RETRIES = 10;
    let assignments = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const shuffledAdults = shuffle(adults);
      const pairs = [];
      let valid = true;

      // Build an assignment list: for each adult, assign 2 receivers
      // using a circular offset to ensure each name appears exactly twice
      const n = shuffledAdults.length;
      const receiverCount = new Map(shuffledAdults.map((u) => [u._id.toString(), 0]));
      const giverAssignments = new Map(shuffledAdults.map((u) => [u._id.toString(), []]));

      // Simple approach: rotate by 1 and 2 positions, skip intra-couple
      for (let i = 0; i < n; i++) {
        const giver = shuffledAdults[i];
        const giverId = giver._id.toString();

        // Find the couple set for this giver
        const giverCoupleIds = new Set([giverId]);
        if (giver.partnerId) {
          const pid = giver.partnerId.toString();
          if (adultMap.has(pid)) giverCoupleIds.add(pid);
        }

        let assigned = 0;
        for (let offset = 1; assigned < 2 && offset < n; offset++) {
          const receiver = shuffledAdults[(i + offset) % n];
          const receiverId = receiver._id.toString();
          if (!giverCoupleIds.has(receiverId) && receiverCount.get(receiverId) < 2) {
            pairs.push({ giverId, receiverId });
            receiverCount.set(receiverId, receiverCount.get(receiverId) + 1);
            giverAssignments.get(giverId).push(receiverId);
            assigned++;
          }
        }

        if (assigned < 2) {
          valid = false;
          break;
        }
      }

      if (valid) {
        assignments = pairs;
        break;
      }
    }

    if (!assignments) {
      return res.status(422).json({ error: 'Could not generate valid assignments. Try re-rolling.' });
    }

    event.assignments = assignments;
    await event.save();

    // Populate names for the response
    const result = assignments.map(({ giverId, receiverId }) => ({
      giverId,
      receiverId,
      giverName: adultMap.get(giverId) ? adultMap.get(giverId).name : giverId,
      receiverName: adultMap.get(receiverId) ? adultMap.get(receiverId).name : receiverId,
    }));

    return res.status(200).json({ assignments: result });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: 'Group not found' });
    }
    throw err;
  }
});

// GET /:groupId/draw — fetch current assignment results
router.get('/:groupId/draw', async (req, res) => {
  try {
    const event = await Event.findById(req.params.groupId);
    if (!event) return res.status(404).json({ error: 'Group not found' });

    if (!event.assignments || event.assignments.length === 0) {
      return res.status(200).json({ assignments: [] });
    }

    const giverIds = [...new Set(event.assignments.map((a) => a.giverId))];
    const receiverIds = [...new Set(event.assignments.map((a) => a.receiverId))];
    const allIds = [...new Set([...giverIds, ...receiverIds])];

    const users = await User.find({ _id: { $in: allIds } });
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const result = event.assignments.map(({ giverId, receiverId }) => ({
      giverId: giverId.toString ? giverId.toString() : giverId,
      receiverId: receiverId.toString ? receiverId.toString() : receiverId,
      giverName: userMap.get(giverId.toString ? giverId.toString() : giverId) || giverId,
      receiverName: userMap.get(receiverId.toString ? receiverId.toString() : receiverId) || receiverId,
    }));

    return res.status(200).json({ assignments: result });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: 'Group not found' });
    }
    throw err;
  }
});

module.exports = router;
