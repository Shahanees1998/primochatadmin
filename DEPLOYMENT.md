# Deployment Guide

This guide explains how to deploy your PrimoChat Admin application using GitHub Actions.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to a GitHub repository
2. **Environment Variables**: All environment variables should be added as GitHub secrets (see below)
3. **Deployment Platform**: Choose one of the supported platforms (Vercel, Railway, Netlify, Heroku)

## Environment Variables Setup

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

| Secret Name | Description |
|-------------|-------------|
| `NEXTAUTH_SECRET` | Your NextAuth secret key |
| `NEXTAUTH_URL` | Your production URL (e.g., `https://yourdomain.com`) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Your Cloudinary upload preset |
| `DATABASE_URL` | Your production database URL |

### 2. Platform-Specific Secrets

Depending on your deployment platform, you'll also need to add these secrets:

#### For Vercel:
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

#### For Railway:
- `RAILWAY_TOKEN` - Your Railway API token
- `RAILWAY_SERVICE` - Your Railway service name

#### For Netlify:
- `NETLIFY_AUTH_TOKEN` - Your Netlify API token
- `NETLIFY_SITE_ID` - Your Netlify site ID

#### For Heroku:
- `HEROKU_API_KEY` - Your Heroku API key
- `HEROKU_APP_NAME` - Your Heroku app name
- `HEROKU_EMAIL` - Your Heroku email

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Get Vercel tokens**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Go to Settings → Tokens
   - Create a new token
   - Get your Project ID and Org ID from your project settings

4. **Add Vercel secrets to GitHub**:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

5. **Use the Vercel workflow**: The `.github/workflows/vercel-deploy.yml` file will handle deployment automatically.

### Option 2: Railway

1. **Create Railway account** and connect your GitHub repository
2. **Get Railway token** from your account settings
3. **Add Railway secrets** to GitHub
4. **Use the Railway workflow** in `.github/workflows/deploy.yml`

### Option 3: Netlify

1. **Create Netlify account** and connect your GitHub repository
2. **Get Netlify token** from your account settings
3. **Add Netlify secrets** to GitHub
4. **Use the Netlify workflow** in `.github/workflows/deploy.yml`

### Option 4: Heroku

1. **Create Heroku account** and create a new app
2. **Get Heroku API key** from your account settings
3. **Add Heroku secrets** to GitHub
4. **Use the Heroku workflow** in `.github/workflows/deploy.yml`

## Workflow Files

- **`.github/workflows/vercel-deploy.yml`**: Simple Vercel deployment
- **`.github/workflows/deploy.yml`**: Multi-platform deployment with testing

## Automatic Deployment

Once set up, your application will automatically deploy when you:

1. **Push to main/master branch** - Triggers production deployment
2. **Create a pull request** - Triggers testing and preview deployment

## Manual Deployment

You can also trigger deployments manually:

1. Go to your GitHub repository
2. Click "Actions" tab
3. Select the deployment workflow
4. Click "Run workflow"

## Environment Variables for Production

Before deploying to production, make sure to update:

- `NEXTAUTH_URL`: Change from `http://localhost:3000` to your production URL
- `DATABASE_URL`: Use your production database URL
- Any other URLs that reference localhost

## Troubleshooting

### Common Issues:

1. **Build fails**: Check that all dependencies are in `package.json`
2. **Environment variables missing**: Ensure all secrets are added to GitHub
3. **Database connection fails**: Verify your production database URL is correct
4. **Cloudinary uploads fail**: Check your Cloudinary credentials

### Debug Steps:

1. Check the GitHub Actions logs for specific error messages
2. Verify all environment variables are set correctly
3. Test the build locally with `npm run build`
4. Check your deployment platform's logs

## Security Notes

- Never commit `.env` files to your repository
- Use GitHub secrets for all sensitive information
- Regularly rotate your API keys and secrets
- Use environment-specific database URLs 