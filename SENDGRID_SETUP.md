# SendGrid Setup for Password Reset Emails

## Overview
This application uses SendGrid to send beautiful, professional password reset emails to users who have forgotten their passwords.

## Setup Steps

### 1. Create a SendGrid Account
1. Go to [SendGrid](https://sendgrid.com/) and create an account
2. Verify your email address
3. Complete the account setup process

### 2. Get Your API Key
1. In your SendGrid dashboard, go to **Settings** > **API Keys**
2. Click **Create API Key**
3. Give it a name (e.g., "Password Reset API Key")
4. Choose **Restricted Access** and select only **Mail Send** permissions
5. Click **Create & View**
6. Copy the API key (you won't be able to see it again)

### 3. Verify Your Sender Domain (Recommended)
1. Go to **Settings** > **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions
4. This ensures better email deliverability

### 4. Environment Variables
Add these to your `.env.local` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com

# Optional: Override the app name in emails
APP_NAME="PrimoChat Admin"
```

### 5. Test the Setup
1. Start your development server
2. Go to the forgot password page
3. Enter a valid email address
4. Check if the email is received
5. Check the console for any SendGrid errors

## Email Features

### Beautiful HTML Template
- Responsive design that works on all devices
- Professional gradient header
- Clear call-to-action button
- Security warnings and expiry information
- Mobile-friendly layout

### Security Features
- 1-hour token expiry
- Secure JWT tokens
- Database-stored reset tokens
- Automatic token cleanup on email failure

### User Experience
- Clear instructions
- Multiple ways to access the reset link
- Professional branding
- Helpful error messages

## Troubleshooting

### Common Issues

1. **"Failed to send reset email"**
   - Check your SendGrid API key
   - Verify the FROM_EMAIL is valid
   - Check SendGrid dashboard for delivery status

2. **Emails going to spam**
   - Verify your sender domain
   - Use a professional FROM_EMAIL address
   - Check your SendGrid reputation score

3. **API key errors**
   - Ensure the API key has "Mail Send" permissions
   - Check if the key is active in SendGrid dashboard

### Testing in Development
If SendGrid is not configured, the system will:
- Log the reset URL to the console
- Return the URL in the response (development only)
- Still generate valid reset tokens

## Production Considerations

1. **Rate Limiting**: SendGrid has rate limits based on your plan
2. **Monitoring**: Set up SendGrid webhooks for delivery tracking
3. **Bounce Handling**: Implement bounce handling for invalid emails
4. **Analytics**: Use SendGrid analytics to monitor email performance

## Alternative Email Services

If you prefer not to use SendGrid, you can modify the code to use:
- Nodemailer with SMTP
- AWS SES
- Mailgun
- Other email service providers

The email template and logic can be easily adapted for any email service.

