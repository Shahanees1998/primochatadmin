# WebSocket Server Deployment Guide

## Quick Deployment Options

### Option 1: Railway (Recommended - Free tier available)
1. **Create account** at [railway.app](https://railway.app)
2. **Create new project** → "Deploy from GitHub repo"
3. **Select the `websocket-server` folder** from your repository
4. **Add environment variables:**
   ```
   NODE_ENV=production
   PORT=3001
   ```
5. **Deploy** - Railway will automatically detect Node.js and install dependencies
6. **Copy the deployment URL** (e.g., `https://your-app.railway.app`)

### Option 2: Render (Free tier available)
1. **Create account** at [render.com](https://render.com)
2. **Create new Web Service**
3. **Connect your GitHub repository**
4. **Configure:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. **Add environment variables:**
   ```
   NODE_ENV=production
   PORT=3001
   ```
6. **Deploy** and copy the URL

### Option 3: Heroku (Paid)
1. **Create account** at [heroku.com](https://heroku.com)
2. **Install Heroku CLI**
3. **Run commands:**
   ```bash
   cd websocket-server
   heroku create your-app-name
   git add .
   git commit -m "Initial WebSocket server"
   git push heroku main
   ```

## Environment Variables

Add these to your Vercel environment variables:

```bash
NEXT_PUBLIC_SOCKET_URL=https://your-websocket-server-url.com
```

## Testing

1. **Deploy the WebSocket server** using one of the options above
2. **Update the socket URL** in your Vercel environment variables
3. **Test locally first:**
   ```bash
   cd websocket-server
   npm install
   npm start
   ```
4. **Check the health endpoint:** `https://your-server.com/health`

## Troubleshooting

### Connection Issues
- **Check CORS settings** in the WebSocket server
- **Verify the socket URL** is correct
- **Check browser console** for connection errors

### Real-time Not Working
- **Ensure WebSocket server is running**
- **Check environment variables** are set correctly
- **Verify socket event listeners** are properly set up

### Local Development
```bash
# Terminal 1: Start WebSocket server
cd websocket-server
npm install
npm start

# Terminal 2: Start your Next.js app
npm run dev
``` 