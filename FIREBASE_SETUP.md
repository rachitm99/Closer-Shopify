# Firebase Setup Guide

## Overview
This app now uses Google Firebase Firestore to store:
- **Session data** (replaces in-memory storage, fixes Vercel serverless issues)
- **Merchant settings** (enabled status, custom message text)

## Setup Steps

### 1. Create a Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **"Add project"** or **"Create a project"**
3. Project name: `closer-shopify-app` (or any name you prefer)
4. Disable Google Analytics (not needed for this app)
5. Click **"Create project"**

### 2. Enable Firestore Database

1. In your Firebase project, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll set rules later)
4. Choose a location closest to your users (e.g., `us-central1`)
5. Click **"Enable"**

### 3. Set Firestore Security Rules

1. In Firestore Database, go to the **"Rules"** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write to sessions collection (server-side only via Admin SDK)
    match /sessions/{document=**} {
      allow read, write: if false; // Only accessible via Admin SDK
    }
    
    // Allow read/write to merchants collection (server-side only)
    match /merchants/{document=**} {
      allow read, write: if false; // Only accessible via Admin SDK
    }
    
    // Allow read/write to settings collection (server-side only)
    match /settings/{document=**} {
      allow read, write: if false; // Only accessible via Admin SDK
    }
  }
}
```

3. Click **"Publish"**

**Note:** These rules deny client access because we're using the Admin SDK (server-side) which bypasses security rules.

### 4. Create a Service Account

1. Go to **Project settings** (gear icon) → **Service accounts** tab
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the confirmation dialog
4. A JSON file will download - **keep this secure!**

### 5. Add Service Account to Environment Variables

#### Local Development (.env file)

1. Open the downloaded JSON file
2. Copy the **entire contents** (it's one long line)
3. Update your `.env` file:

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"closer-shopify-app","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Important:** The entire JSON must be on one line, no line breaks!

#### Vercel Environment Variables

1. Go to https://vercel.com → Your Project → **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
4. Value: Paste the entire JSON (one line)
5. Environment: Select **Production**, **Preview**, and **Development**
6. Click **"Save"**

### 6. Deploy and Test

1. After adding the environment variable to Vercel, go to **Deployments**
2. Click on the latest deployment → **⋯ menu** → **Redeploy**
3. Once deployed, test the app:
   - Install/reinstall the app
   - Toggle the reward message on/off
   - Update the custom message
   - Complete a test checkout to see if the extension fetches settings correctly

## Database Collections Structure

### `sessions` Collection
```typescript
{
  [sessionId]: {
    data: string,        // Encrypted session data
    shop: string,        // Shop domain
    updatedAt: string    // ISO timestamp
  }
}
```

### `settings` Collection
```typescript
{
  [shop]: {
    shop: string,        // Shop domain
    enabled: boolean,    // Whether message is enabled
    message: string,     // Custom message text
    updatedAt: string    // ISO timestamp
  }
}
```

## Troubleshooting

### Error: "Firebase Admin initialization error"
- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly
- Ensure the JSON is valid (no extra spaces or line breaks)
- Verify the service account has proper permissions

### Error: "Failed to fetch settings"
- Check Firestore security rules are published
- Verify the service account exists
- Check Vercel logs for detailed errors

### Extension not showing updated message
- Check the public API endpoint: `https://closer-shopify-qq8c.vercel.app/api/settings/public?shop=YOUR_SHOP.myshopify.com`
- Verify CORS headers are set correctly
- Check browser console for fetch errors
- Redeploy the extension: `shopify app deploy`

## Cost Considerations

Firebase Firestore has a generous free tier:
- **50,000 reads/day**
- **20,000 writes/day**
- **1GB storage**

For a small-to-medium Shopify app, this should be more than enough. Monitor usage in Firebase Console under **Usage** tab.

## Next Steps

After Firebase is set up:
1. Test the app thoroughly
2. Complete a test checkout
3. Verify the extension displays your custom message
4. Monitor Firebase usage and Vercel logs
