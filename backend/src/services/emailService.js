const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

const createTransporter = () => {
  if (transporter) return transporter;
  if (!config.SMTP_USER || !config.SMTP_PASS) {
    console.warn('[EmailService] SMTP credentials not provided. Emails will not be sent.');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  return transporter;
};

const sendCompanyInvitation = async (toEmail, companyName, setupUrl) => {
  const mailTransporter = createTransporter();
  
  if (!mailTransporter) {
    console.warn(`[EmailService] Skipping email to ${toEmail} because SMTP is not configured.`);
    return false;
  }

  const htmlTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Welcome to SupportCue</title>
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #0f172a;
        color: #f8fafc;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        padding: 40px;
        background: linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9));
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .logo {
        text-align: center;
        margin-bottom: 30px;
      }
      .logo span {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(to right, #22d3ee, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .content {
        background-color: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 30px;
        text-align: center;
      }
      h1 {
        color: #f8fafc;
        font-size: 20px;
        margin-top: 0;
        margin-bottom: 15px;
      }
      p {
        color: #cbd5e1;
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 25px;
      }
      .button {
        display: inline-block;
        background: linear-gradient(to right, #0ea5e9, #6366f1);
        color: white !important;
        text-decoration: none;
        font-weight: 600;
        padding: 12px 30px;
        border-radius: 12px;
        font-size: 15px;
        box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        font-size: 12px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">
        <span>SupportCue</span>
      </div>
      <div class="content">
        <h1>Welcome, ${companyName}!</h1>
        <p>Your company workspace has been successfully provisioned. You're just one step away from deploying intelligent, AI-powered support.</p>
        <p>Please click the button below to set up your admin password and access your dashboard.</p>
        <a href="${setupUrl}" class="button">Setup Workspace</a>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} SupportCue. All rights reserved.<br>
        If you did not request this invitation, please ignore this email.
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    await mailTransporter.sendMail({
      from: '"SupportCue" <' + config.SMTP_USER + '>',
      to: toEmail,
      subject: 'Complete your SupportCue Workspace Setup',
      html: htmlTemplate,
    });
    console.log(`[EmailService] Invitation email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${toEmail}:`, error.message);
    return false;
  }
};

const sendAgentInvitation = async (toEmail, companyName, setupUrl) => {
  const mailTransporter = createTransporter();

  if (!mailTransporter) {
    console.warn(`[EmailService] Skipping email to ${toEmail} because SMTP is not configured.`);
    return false;
  }

  const htmlTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Join ${companyName} on SupportCue</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color:#0f172a; color:#f8fafc; margin:0; padding:0;">
    <div style="max-width:600px; margin:40px auto; padding:40px; background:linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9)); border:1px solid rgba(255,255,255,0.1); border-radius:24px;">
      <div style="text-align:center; margin-bottom:30px;">
        <span style="font-size:24px; font-weight:800; color:#22d3ee;">SupportCue</span>
      </div>
      <div style="background-color:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:30px; text-align:center;">
        <h1 style="color:#f8fafc; font-size:20px; margin-top:0; margin-bottom:15px;">You've been invited to join ${companyName}</h1>
        <p style="color:#cbd5e1; font-size:15px; line-height:1.6; margin-bottom:25px;">
          You'll be able to see incoming conversations, take over from the AI assistant, and reply to customers directly.
        </p>
        <a href="${setupUrl}" style="display:inline-block; background:linear-gradient(to right, #0ea5e9, #6366f1); color:#ffffff !important; text-decoration:none; font-weight:600; padding:12px 30px; border-radius:12px; font-size:15px;">Create your account</a>
        <p style="color:#64748b; font-size:12px; margin-top:22px; margin-bottom:0;">This link expires in 7 days and can be used once.</p>
      </div>
      <div style="text-align:center; margin-top:30px; font-size:12px; color:#64748b;">
        &copy; ${new Date().getFullYear()} SupportCue.<br>
        If you weren't expecting this invitation, you can ignore this email.
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    await mailTransporter.sendMail({
      from: '"SupportCue" <' + config.SMTP_USER + '>',
      to: toEmail,
      subject: `Join ${companyName} on SupportCue`,
      html: htmlTemplate,
    });
    console.log(`[EmailService] Agent invitation sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${toEmail}:`, error.message);
    return false;
  }
};

module.exports = {
  sendCompanyInvitation,
  sendAgentInvitation
};
