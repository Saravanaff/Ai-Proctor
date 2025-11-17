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

