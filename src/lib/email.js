'use strict';

const { Resend } = require('resend');

const resend = new Resend(process.env.SMTP_PASS);

async function sendOtpEmail(to, code) {
  await resend.emails.send({
    from: 'noreply@amidonlabs.com',
    to,
    subject: 'Your Sinterklaas login code',
    html: `<p>Your one-time login code is: <strong>${code}</strong>. It expires in 10 minutes.</p>`,
  });
}

module.exports = { sendOtpEmail };
