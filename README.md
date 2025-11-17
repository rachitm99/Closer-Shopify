# Shopify Reward Message App

A **free** Next.js Shopify app that allows merchants to enable/disable a predefined reward message on the order confirmation (Thank You) page.


> **📢 This app is completely free to use!** No subscription required, no hidden fees.

## Features

- 💰 **Completely Free**: No subscription fees, no payment required
- 🎉 **Simple Toggle**: Enable or disable the reward message with a single switch
- 🎨 **Beautiful UI**: Built with Shopify Polaris components for a native admin experience
- 🔒 **Secure OAuth**: Implements Shopify OAuth2 authentication
- 💾 **No Backend Storage**: Uses Shopify metafields to store settings directly in the merchant's store
- 📱 **Responsive**: Works seamlessly on desktop and mobile devices
- ✅ **Tested**: Includes comprehensive test coverage with Jest

## Architecture

### Key Components

1. **OAuth Authentication** (`/pages/api/auth`)
   - Handles Shopify OAuth2 flow
   - Session management with encrypted storage
   - Secure token handling

2. **Settings API** (`/pages/api/settings`)
   - Read/write reward message toggle state
   - Stores data in Shopify metafields
   - No custom database required

3. **App Proxy** (`/pages/api/proxy/reward`)
   - Injects reward message on Thank You page
   - Checks metafield state before rendering
   - Returns HTML/CSS for the message

4. **Merchant UI** (`/pages/index.tsx`)
   - Settings page with Polaris components
   - Toggle switch for enabling/disabling
   - Live preview of the reward message

## Prerequisites

- Node.js 18+ installed
- A Shopify Partner account
- A development store for testing
- Vercel account (for deployment)

## Setup Instructions

### 1. Create a Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Navigate to **Apps** → **Create app** → **Custom app**
3. Fill in app details:
   - **App name**: Reward Message App
   - **App URL**: `https://your-app.vercel.app` (temporary, will update after deployment)
   - **Allowed redirection URL(s)**: 
     - `https://your-app.vercel.app/api/auth/callback`

4. Note your **API key** and **API secret**

### 2. Configure API Scopes

In your app settings, configure the following scopes:
- `read_orders` - To access order information
- `write_script_tags` - To inject scripts (optional)
- `read_customers` - To access customer data (optional)

### 3. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd closer-shopify-subscription

# Install dependencies
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your Shopify app credentials:

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SCOPES=read_orders,write_script_tags,read_customers

HOST=https://your-app-url.vercel.app
SHOPIFY_APP_URL=https://your-app-url.vercel.app

# Generate a random string for encryption
ENCRYPTION_SECRET=your_random_encryption_secret_32chars

NODE_ENV=production
```

**To generate a secure encryption secret:**

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 5. Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your Git repository
4. Configure environment variables in Vercel:
   - Go to **Settings** → **Environment Variables**
   - Add all variables from `.env`
5. Deploy

### 6. Update Shopify App URLs

After deployment, update your Shopify app settings:

1. Go to your app in Shopify Partners
2. Update **App URL** to: `https://your-actual-app.vercel.app`
3. Update **Allowed redirection URL(s)** to: `https://your-actual-app.vercel.app/api/auth/callback`

### 7. Configure App Proxy (Important!)

To display the reward message on the Thank You page:

1. In your Shopify app settings, go to **App setup** → **App proxy**
2. Configure:
   - **Subpath prefix**: `apps`
   - **Subpath**: `reward-message`
   - **Proxy URL**: `https://your-app.vercel.app/api/proxy/reward`

This creates the proxy URL: `https://yourstore.myshopify.com/apps/reward-message`

### 8. Add Liquid Code to Thank You Page

To display the reward message, add this Liquid code to your Thank You page:

1. Go to **Settings** → **Checkout** in your Shopify admin
2. Scroll to **Order status page** → **Additional scripts**
3. Add this code:

```liquid
<div id="reward-message-app"></div>
<script>
  fetch('https://{{ shop.domain }}/apps/reward-message?shop={{ shop.permanent_domain }}')
    .then(response => response.text())
    .then(html => {
      document.getElementById('reward-message-app').innerHTML = html;
    })
    .catch(error => console.error('Error loading reward message:', error));
</script>
```

### 9. Install the App

1. Generate an install URL:
   ```
   https://your-app.vercel.app/api/auth?shop=your-store.myshopify.com
   ```

2. Visit this URL in your browser
3. Click **Install** to authorize the app

## Development

### Run Locally

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

For local development with Shopify, you'll need to use a tunneling service like ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Update your .env with the ngrok URL
HOST=https://your-ngrok-url.ngrok.io
SHOPIFY_APP_URL=https://your-ngrok-url.ngrok.io

# Restart your dev server
npm run dev
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Lint code
npm run lint
```

## How It Works

### 1. Merchant Enables Reward Message

- Merchant visits the app settings page
- Toggles the switch to enable the reward message
- App stores `enabled: true` in Shopify metafields

### 2. Customer Completes Order

- Customer completes checkout
- Shopify redirects to Thank You page
- Liquid script on Thank You page calls app proxy

### 3. App Proxy Checks Settings

- Proxy endpoint receives request
- Checks merchant's metafield for enabled status
- If enabled, returns HTML for reward message
- If disabled, returns empty response

### 4. Message Displays

- Liquid script injects HTML into Thank You page
- Customer sees: "🎉 Congratulations! You have won a reward!"

## Project Structure

```
closer-shopify-subscription/
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── index.ts          # OAuth initiation
│   │   │   └── callback.ts       # OAuth callback
│   │   ├── settings/
│   │   │   └── index.ts          # Settings API (GET/POST)
│   │   └── proxy/
│   │       └── reward.ts         # App proxy endpoint
│   ├── _app.tsx                  # App wrapper with Polaris
│   ├── _document.tsx             # HTML document
│   └── index.tsx                 # Main settings page
├── lib/
│   ├── shopify.ts                # Shopify API configuration
│   ├── session-storage.ts        # Session management
│   └── auth-helpers.ts           # Auth utility functions
├── __tests__/
│   └── index.test.tsx            # Tests for settings page
├── .env.example                  # Environment variables template
├── next.config.js                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest testing configuration
├── vercel.json                   # Vercel deployment config
└── package.json                  # Dependencies and scripts
```

## API Endpoints

### `GET /api/auth?shop={shop}`
Initiates OAuth flow for the specified shop.

### `GET /api/auth/callback`
Handles OAuth callback and stores session.

### `GET /api/settings`
Returns current reward message status.

**Response:**
```json
{
  "enabled": true,
  "metafieldId": "12345"
}
```

### `POST /api/settings`
Updates reward message status.

**Request:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "enabled": true
}
```

### `GET /api/proxy/reward?shop={shop}`
Returns HTML for reward message if enabled.

**Response (if enabled):**
```html
<div id="reward-message-container" style="...">
  <div>🎉 Congratulations!</div>
  <div>You have won a reward!</div>
</div>
```

## Security Considerations

1. **OAuth2**: Secure authentication flow
2. **Session Encryption**: Sessions encrypted with AES-256
3. **HTTPS Only**: All communications over HTTPS
4. **Input Validation**: Shop domains validated against Shopify format
5. **CORS**: Properly configured CORS headers
6. **Environment Variables**: Sensitive data in environment variables

## Production Considerations

### Session Storage

The current implementation uses in-memory session storage, which is suitable for development but **NOT for production**.

For production, implement persistent storage:

**Option 1: PostgreSQL**
```typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**Option 2: Redis**
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

**Option 3: MongoDB**
```typescript
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI);
```

Update `lib/session-storage.ts` to use your chosen database.

### Error Monitoring

Consider adding error monitoring:

```bash
npm install @sentry/nextjs
```

Configure in `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, { silent: true });
```

### Rate Limiting

Implement rate limiting for API routes to prevent abuse.

## Troubleshooting

### "Shop parameter missing"
- Ensure you're accessing the app via the install URL
- Check that the shop parameter is in the URL

### "Unauthorized" error
- Clear browser cookies
- Reinstall the app
- Check that OAuth redirect URLs match exactly

### Reward message not showing
- Verify app proxy is configured correctly
- Check Liquid code is added to Thank You page
- Ensure reward message is enabled in settings
- Check browser console for errors

### TypeScript errors during build
- Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` configuration
- Verify Next.js and TypeScript versions are compatible

## Support

For issues and questions:
- Check the [Shopify App Development docs](https://shopify.dev/docs/apps)
- Review [Next.js documentation](https://nextjs.org/docs)
- Check [Shopify Polaris components](https://polaris.shopify.com/)

## License

MIT License - feel free to use this code for your own projects.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### Version 1.0.0
- Initial release
- OAuth2 authentication
- Reward message toggle
- App proxy integration
- Polaris UI
- Jest testing setup
