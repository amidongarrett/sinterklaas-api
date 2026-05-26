'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const requireAuth = require('../middleware/requireAuth');
const { sendOtpEmail } = require('../lib/email');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/request-otp
router.post('/request-otp', async (req, res) => {
  try {
    const { email, displayName } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      if (!displayName) {
        return res.status(404).json({ error: 'No account for that email. Provide a displayName to create one.' });
      }
      user = new User({ email, name: displayName, role: 'participant', childrenIds: [] });
      await user.save();
      isNewUser = true;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await new Otp({ userId: user._id, code, expiresAt }).save();

    await sendOtpEmail(user.email, code);

    return res.status(200).json({ userId: user._id.toString(), isNewUser });
  } catch (err) {
    console.error('[request-otp]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code are required' });
    }

    const otp = await Otp.findOne({ userId, code, used: false });
    if (!otp) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    if (otp.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Code expired' });
    }

    otp.used = true;
    await otp.save();

    const user = await User.findById(userId);
    const token = jwt.sign(
      { sub: userId, email: user.email, displayName: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('session', token, cookieOptions);

    return res.status(200).json({ user: { _id: userId, displayName: user.name, email: user.email } });
  } catch (err) {
    console.error('[verify-otp]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('session', { httpOnly: true, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure });
  return res.status(200).json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({
    user: {
      _id: req.user.sub,
      email: req.user.email,
      displayName: req.user.displayName,
    },
  });
});

module.exports = router;
