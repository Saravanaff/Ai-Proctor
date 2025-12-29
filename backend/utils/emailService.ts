import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Email configuration with better error handling
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || "gmail";
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.error("⚠️  Email credentials not configured!");
    console.error("Please set EMAIL_USER and EMAIL_PASSWORD in your .env file");
    throw new Error("Email configuration is missing");
  }

  // Configuration for different email services
  if (emailService === "gmail") {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } else if (emailService === "custom") {
    // Custom SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  } else {
    // Use service name (gmail, yahoo, outlook, etc.)
    return nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }
};

let transporter: nodemailer.Transporter;

try {
  transporter = createTransporter();
} catch (error) {
  console.error("Failed to create email transporter:", error);
}

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Your OTP Code - AI Proctor",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #4CAF50;
            text-align: center;
            letter-spacing: 5px;
            padding: 20px;
            background-color: #f0f0f0;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #777;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Proctor Verification</h1>
          </div>
          <div class="content">
            <h2>Your One-Time Password (OTP)</h2>
            <p>Hello,</p>
            <p>You have requested an OTP for verification. Please use the code below:</p>
            <div class="otp-code">${otp}</div>
            <p><strong>This code will expire in 10 minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p>Thank you,<br>The AI Proctor Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`,
  };

  try {
    if (!transporter) {
      throw new Error("Email transporter not initialized. Please check your email configuration.");
    }
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${to}`);
  } catch (error: any) {
    console.error("❌ Error sending OTP email:", error);

    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      throw new Error("Email authentication failed. Please check your EMAIL_USER and EMAIL_PASSWORD. For Gmail, use an App Password.");
    } else if (error.code === 'ESOCKET') {
      throw new Error("Could not connect to email server. Check your internet connection.");
    } else if (error.code === 'EENVELOPE') {
      throw new Error("Invalid email address format.");
    } else {
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }
};

export const sendAdminCreationEmail = async (
  to: string,
  name: string,
  email: string,
  password: string
): Promise<void> => {
  const loginUrl = process.env.FRONTEND_URL || "https://localhost:3000";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Welcome to AI Proctor - Admin Account Created",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .credentials-box {
            background-color: #f0f0f0;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .credential-item {
            margin: 10px 0;
          }
          .credential-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            width: 100px;
          }
          .credential-value {
            color: #667eea;
            font-family: monospace;
            font-size: 16px;
          }
          .login-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #777;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to AI Proctor</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Admin Account Created</p>
          </div>
          <div class="content">
            <h2>Hello ${name}! 👋</h2>
            <p>An admin account has been created for you on <strong>AI Proctor</strong>, the advanced online examination proctoring system.</p>
            
            <p>You can now access the platform with the following credentials:</p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong> Please change your password after your first login for security purposes.
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="login-button">Login to AI Proctor</a>
            </div>

            <h3>What you can do as an Admin:</h3>
            <ul>
              <li>Create and manage exams</li>
              <li>Monitor exam participants in real-time</li>
              <li>Configure AI proctoring settings</li>
              <li>Review exam logs and violations</li>
              <li>Generate detailed reports</li>
            </ul>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Thank you,<br><strong>The AI Proctor Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>© ${new Date().getFullYear()} AI Proctor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to AI Proctor!
      
      An admin account has been created for you.
      
      Login Credentials:
      Email: ${email}
      Password: ${password}
      
      Login URL: ${loginUrl}
      
      Please change your password after your first login for security purposes.
      
      Thank you,
      The AI Proctor Team
    `,
  };

  try {
    if (!transporter) {
      throw new Error("Email transporter not initialized. Please check your email configuration.");
    }
    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin creation email sent successfully to ${to}`);
  } catch (error: any) {
    console.error("❌ Error sending admin creation email:", error);

    if (error.code === 'EAUTH') {
      throw new Error("Email authentication failed. Please check your EMAIL_USER and EMAIL_PASSWORD. For Gmail, use an App Password.");
    } else if (error.code === 'ESOCKET') {
      throw new Error("Could not connect to email server. Check your internet connection.");
    } else if (error.code === 'EENVELOPE') {
      throw new Error("Invalid email address format.");
    } else {
      throw new Error(`Failed to send admin creation email: ${error.message}`);
    }
  }
};

export const sendStudentExamInvitationEmail = async (
  to: string,
  studentName: string,
  email: string,
  password: string,
  examName: string,
  examKey: string,
  startTime: string,
  endTime: string,
  duration: number
): Promise<void> => {
  const sebFilePath = process.env.SEB_FILE_PATH || "c:\\Users\\mjpra\\Ai-Proctor\\backend\\Proctor.seb";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Exam Invitation: ${examName} - AI Proctor`,
    attachments: [
      {
        filename: 'Proctor.seb',
        path: sebFilePath,
      }
    ],
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .exam-details {
            background-color: #f8f9fa;
            border-left: 4px solid #4CAF50;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .detail-item {
            margin: 12px 0;
            display: flex;
            align-items: center;
          }
          .detail-label {
            font-weight: bold;
            color: #555;
            min-width: 140px;
            display: inline-block;
          }
          .detail-value {
            color: #4CAF50;
            font-weight: 600;
          }
          .exam-key {
            background-color: #fff3cd;
            border: 2px dashed #ffc107;
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
          }
          .exam-key-label {
            font-size: 12px;
            color: #856404;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .exam-key-value {
            font-size: 32px;
            font-weight: bold;
            color: #856404;
            letter-spacing: 3px;
            font-family: monospace;
            margin-top: 8px;
          }
          .credentials-box {
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .credential-item {
            margin: 10px 0;
          }
          .credential-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            width: 100px;
          }
          .credential-value {
            color: #2196F3;
            font-family: monospace;
            font-size: 16px;
          }
          .seb-download {
            background-color: #e8f5e9;
            border-left: 4px solid #4CAF50;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .download-button {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 10px 0;
            font-size: 16px;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .important {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            color: #721c24;
          }
          .instructions {
            background-color: #d1ecf1;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #777;
            font-size: 12px;
          }
          ul {
            padding-left: 20px;
          }
          li {
            margin: 8px 0;
          }
          .attachment-notice {
            background-color: #fff9e6;
            border: 2px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Exam Invitation</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">You're invited to take an exam</p>
          </div>
          <div class="content">
            <h2>Hello ${studentName}! 👋</h2>
            <p>You have been scheduled to take the following exam on <strong>AI Proctor</strong>. Please read all the details carefully.</p>
            
            <div class="exam-details">
              <h3 style="margin-top: 0; color: #4CAF50;">📋 Exam Details</h3>
              <div class="detail-item">
                <span class="detail-label">Exam Name:</span>
                <span class="detail-value">${examName}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Start Time:</span>
                <span class="detail-value">${new Date(startTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">End Time:</span>
                <span class="detail-value">${new Date(endTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${duration} minutes</span>
              </div>
            </div>

            <div class="exam-key">
              <div class="exam-key-label">🔑 Your Exam Key</div>
              <div class="exam-key-value">${examKey}</div>
            </div>

            <div class="credentials-box">
              <h3 style="margin-top: 0; color: #2196F3;">🔐 Login Credentials</h3>
              <p style="margin-bottom: 15px;">Use these credentials when prompted by Safe Exam Browser:</p>
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
              </div>
            </div>

            <div class="attachment-notice">
              <strong>📎 ATTACHMENT:</strong> This email contains a <strong>Proctor.seb</strong> file. You will need this file to access the exam.
            </div>

            <div class="important">
              <strong>⚠️ IMPORTANT:</strong> Please attend the exam before the end time. Late submissions will not be accepted.
            </div>

            <div class="seb-download">
              <h3 style="margin-top: 0; color: #4CAF50;">🔒 How to Take the Exam</h3>
              <p><strong>Step 1:</strong> Download and install Safe Exam Browser (SEB) from the official website:</p>
              <div style="text-align: center; margin: 15px 0;">
                <a href="https://safeexambrowser.org/download_en.html" class="download-button">Download Safe Exam Browser</a>
              </div>
              <p><strong>Step 2:</strong> Download the attached <strong>Proctor.seb</strong> file from this email.</p>
              <p><strong>Step 3:</strong> Double-click the <strong>Proctor.seb</strong> file to open it with Safe Exam Browser.</p>
              <p><strong>Step 4:</strong> The browser will automatically launch and navigate to the exam platform. Use your login credentials provided above.</p>
            </div>

            <div class="instructions">
              <h3 style="margin-top: 0; color: #17a2b8;">📌 Important Instructions</h3>
              <ul>
                <li><strong>Install Safe Exam Browser</strong> at least 15 minutes before the exam start time</li>
                <li><strong>Do NOT use a regular web browser</strong> - you must use the attached SEB file</li>
                <li>Enter the exam key provided above when prompted</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Have your webcam and microphone ready for proctoring</li>
                <li>Close all unnecessary applications before opening the SEB file</li>
                <li>Find a quiet, well-lit place to take the exam</li>
              </ul>
            </div>

            <div class="warning">
              <strong>🔒 Security Note:</strong> Please change your password after your first login for security purposes.
            </div>

            <p style="margin-top: 30px;">If you have any questions or face any technical issues, please contact your exam administrator immediately.</p>
            
            <p>Good luck! 🎯<br><strong>The AI Proctor Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>© ${new Date().getFullYear()} AI Proctor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Exam Invitation - AI Proctor
      
      Hello ${studentName}!
      
      You have been scheduled to take the following exam:
      
      EXAM DETAILS:
      -------------
      Exam Name: ${examName}
      Start Time: ${new Date(startTime).toLocaleString()}
      End Time: ${new Date(endTime).toLocaleString()}
      Duration: ${duration} minutes
      
      EXAM KEY: ${examKey}
      
      LOGIN CREDENTIALS:
      ------------------
      Email: ${email}
      Password: ${password}
      
      IMPORTANT: Please attend the exam before the end time. Late submissions will not be accepted.
      
      ATTACHMENT: This email contains a Proctor.seb file. You will need this file to access the exam.
      
      HOW TO TAKE THE EXAM:
      ---------------------
      Step 1: Download and install Safe Exam Browser (SEB) from https://safeexambrowser.org/download_en.html
      Step 2: Download the attached Proctor.seb file from this email
      Step 3: Double-click the Proctor.seb file to open it with Safe Exam Browser
      Step 4: The browser will automatically launch and navigate to the exam platform. Use your login credentials provided above.
      
      IMPORTANT INSTRUCTIONS:
      - Install Safe Exam Browser at least 15 minutes before the exam start time
      - Do NOT use a regular web browser - you must use the attached SEB file
      - Enter the exam key when prompted
      - Ensure stable internet connection
      - Have webcam and microphone ready
      - Close unnecessary applications before opening the SEB file
      - Find a quiet, well-lit place
      
      Good luck!
      The AI Proctor Team
    `,
  };

  try {
    if (!transporter) {
      throw new Error("Email transporter not initialized. Please check your email configuration.");
    }
    await transporter.sendMail(mailOptions);
    console.log(`✅ Exam invitation email sent successfully to ${to}`);
  } catch (error: any) {
    console.error("❌ Error sending exam invitation email:", error);

    if (error.code === 'EAUTH') {
      throw new Error("Email authentication failed. Please check your EMAIL_USER and EMAIL_PASSWORD. For Gmail, use an App Password.");
    } else if (error.code === 'ESOCKET') {
      throw new Error("Could not connect to email server. Check your internet connection.");
    } else if (error.code === 'EENVELOPE') {
      throw new Error("Invalid email address format.");
    } else {
      throw new Error(`Failed to send exam invitation email: ${error.message}`);
    }
  }
};

