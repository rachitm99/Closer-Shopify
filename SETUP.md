# Shopify Reward Message App - Quick Start Guide

This guide will help you get your Shopify reward message app up and running quickly.

## ⚡ Quick Setup (5 minutes)

### Step 1: Install Dependencies

```powershell
npm install
```

### Step 2: Create Shopify App

1. Visit [partners.shopify.com](https://partners.shopify.com)
2. Go to **Apps** → **Create app**
3. Choose **Custom app**
4. Note your API credentials

### Step 3: Configure Environment

```powershell
# Copy the example env file
Copy-Item .env.example .env

# Edit .env with your credentials
notepad .env
```

Fill in:
- `SHOPIFY_API_KEY` - From Shopify Partners
- `SHOPIFY_API_SECRET` - From Shopify Partners
- `ENCRYPTION_SECRET` - Generate random string (see below)

**Generate encryption secret:**

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 4: Deploy to Vercel

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Copy your deployment URL (e.g., `https://your-app.vercel.app`)

### Step 5: Update Shopify App URLs

Back in Shopify Partners:

1. **App URL**: `https://your-app.vercel.app`
2. **Redirect URLs**: `https://your-app.vercel.app/api/auth/callback`

### Step 6: Configure App Proxy

In your Shopify app settings:

1. Go to **App setup** → **App proxy**
2. Set:
   - **Subpath prefix**: `apps`
   - **Subpath**: `reward-message`
   - **Proxy URL**: `https://your-app.vercel.app/api/proxy/reward`

### Step 7: Add to Thank You Page

1. Go to **Shopify Admin** → **Settings** → **Checkout**
2. Scroll to **Order status page** → **Additional scripts**
3. Paste:

```liquid
<div id="reward-message-app"></div>
<script>
  fetch('https://{{ shop.domain }}/apps/reward-message?shop={{ shop.permanent_domain }}')
    .then(response => response.text())
    .then(html => {
      document.getElementById('reward-message-app').innerHTML = html;
    });
</script>
```

### Step 8: Install & Test

1. Visit: `https://your-app.vercel.app/api/auth?shop=your-store.myshopify.com`
2. Click **Install**
3. Toggle the reward message **ON**
4. Complete a test order
5. Check the Thank You page! 🎉

## 🔧 Development Mode

### Local Development

```powershell
# Start dev server
npm run dev
```

### Use ngrok for testing with Shopify

```powershell
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000
```

Update `.env` with ngrok URL and restart dev server.

## 📝 Common Issues

### Issue: "Shop parameter missing"
**Solution**: Use the install URL format: `https://your-app.vercel.app/api/auth?shop=your-store.myshopify.com`

### Issue: Message not showing on Thank You page
**Solution**: 
1. Verify app proxy is configured
2. Check Liquid code is added
3. Ensure toggle is enabled in app settings

### Issue: Unauthorized error
**Solution**:
1. Clear cookies
2. Reinstall the app
3. Check OAuth redirect URLs match exactly

## 🧪 Testing

```powershell
# Run tests
npm test

# Watch mode
npm run test:watch
```

## 📚 Next Steps

1. **Production Database**: Replace in-memory session storage with PostgreSQL/Redis
2. **Error Monitoring**: Add Sentry or similar
3. **Analytics**: Track message views and conversions
4. **Customization**: Allow merchants to customize the message (future feature)

## 🆘 Need Help?

- Read the full [README.md](./README.md)
- Check [Shopify App Docs](https://shopify.dev/docs/apps)
- Review [Next.js Docs](https://nextjs.org/docs)

---

**Congratulations! Your app is ready to go! 🚀**
