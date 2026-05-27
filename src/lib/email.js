'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // port 465 uses SSL, not STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

async function sendOtpEmail(to, code) {
  await transporter.sendMail({
    from: 'noreply@amidonlabs.com',
    to,
    subject: 'Your Sinterklaas login code',
    html: `<p>Your one-time login code is: <strong>${code}</strong>. It expires in 10 minutes.</p>`,
  });
}

module.exports = { sendOtpEmail, transporter };
