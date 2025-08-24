import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';

// Configure SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'app.thebuilders@gmail.com';
const APP_NAME = 'FRATERNA Admin';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Create JWT token for the reset link
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
        resetToken,
        type: 'password-reset'
      },
      '6ac1ce8466e02c6383fb70103b51cdffd9cb3394970606ef0b2e2835afe77a7e',
        // process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'https://primoochat.vercel.app'}/auth/reset-password?token=${jwtToken}`;

    // Send email if SendGrid is configured
    if (SENDGRID_API_KEY) {
      try {
        const emailContent = createPasswordResetEmail(user.firstName, resetUrl);
        
        await sgMail.send({
          to: user.email,
          from: FROM_EMAIL,
          subject: `Reset Your ${APP_NAME} Password`,
          html: emailContent,
        });

        console.log(`Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        
        // Clear the reset token since email failed
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken: null,
            resetTokenExpiry: null,
          },
        });

        return NextResponse.json(
          { error: 'Failed to send reset email. Please try again later.' },
          { status: 500 }
        );
      }
    } else {
      console.log('SendGrid not configured. Reset URL:', resetUrl);
      // In development, you might want to return the URL for testing
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          message: 'Password reset link generated (SendGrid not configured)',
          resetUrl: resetUrl,
        });
      }
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function createPasswordResetEmail(firstName: string, resetUrl: string): string {
  const expiryTime = '1 hour';
  const currentYear = new Date().getFullYear();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 18px;
                margin-bottom: 20px;
                color: #555;
            }
            .message {
                font-size: 16px;
                margin-bottom: 30px;
                color: #666;
            }
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            .reset-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 30px 0;
                color: #856404;
            }
            .warning h3 {
                margin: 0 0 10px 0;
                color: #856404;
                font-size: 16px;
            }
            .warning ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            .warning li {
                margin: 5px 0;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            .footer a:hover {
                text-decoration: underline;
            }
            .expiry-notice {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
                color: #1976d2;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .header, .content, .footer {
                    padding: 20px;
                }
                .header h1 {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset</h1>
            </div>
            
            <div class="content">
                <div class="greeting">Hello ${firstName},</div>
                
                <div class="message">
                    We received a request to reset your password for your ${APP_NAME} account. 
                    If you didn't make this request, you can safely ignore this email.
                </div>
                
                <div class="button-container">
                    <a href="${resetUrl}" class="reset-button">
                        Reset My Password
                    </a>
                </div>
                
                <div class="expiry-notice">
                    ⏰ This link will expire in <strong>${expiryTime}</strong>
                </div>
                
                <div class="warning">
                    <h3>⚠️ Security Notice:</h3>
                    <ul>
                        <li>This link is valid for ${expiryTime} only</li>
                        <li>Never share this link with anyone</li>
                        <li>If you didn't request this, please contact support immediately</li>
                        <li>Your password will only be changed if you click the link above</li>
                    </ul>
                </div>
                
                <div class="message">
                    If the button above doesn't work, you can copy and paste this link into your browser:
                    <br><br>
                    <a href="${resetUrl}" style="word-break: break-all; color: #667eea;">${resetUrl}</a>
                </div>
            </div>
            
            <div class="footer">
                <p>This email was sent to your email address.</p>
                <p>If you have any questions, please contact our support team.</p>
                <p>&copy; ${currentYear} ${APP_NAME}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
} 