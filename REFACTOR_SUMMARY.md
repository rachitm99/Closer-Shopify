# Refactor Summary: Billing Removed, Firebase Added

## Changes Made

### ✅ Removed
- All billing API endpoints (`/api/billing/*`)
- Subscription checking logic
- Payment UI components
- Trial period code
- Test subscription tools

### ✅ Added

#### 1. **Firebase Firestore Integration**
- `lib/firestore.ts` - Firebase Admin SDK configuration
- Persistent storage for sessions and merchant data
- Fixes Vercel serverless session loss issues

#### 2. **New API Endpoints**
- `POST/GET /api/settings/merchant` - Authenticated endpoint for merchants to manage settings
- `GET /api/settings/public` - Public endpoint for extension to fetch settings (CORS enabled)

#### 3. **Updated Extension**
- Fetches settings from Vercel API instead of using static `useSettings()`
- Connects extension to backend for real-time configuration
- Uses `useApi()` hook to get shop domain
- Implements loading states and error handling

#### 4. **Simplified UI**
- Removed subscription cards and billing prompts
- Clean toggle for enable/disable
- Text field for custom message
- Help text and instructions
- No payment required - completely free!

### Database Schema

```typescript
// Firestore Collections

sessions/
  [sessionId]: {
    data: string        // Encrypted Shopify session
    shop: string       // Shop domain
    updatedAt: string  // ISO timestamp
  }

settings/
  [shop]: {
    shop: string       // Shop domain  
    enabled: boolean   // Message enabled status
    message: string    // Custom message text
    updatedAt: string  // ISO timestamp
  }
```

### Architecture Flow

```
Merchant (Shopify Admin)
  ↓
Vercel App (/pages/index.tsx)
  ↓
API: /api/settings/merchant (Authenticated)
  ↓
Firestore Database
  ↑
API: /api/settings/public (Public, CORS)
  ↑
Extension (checkout-reward)
  ↑
Customer (Thank You Page)
```

## Setup Required

### 1. Firebase Console
1. Create Firebase project
2. Enable Firestore
3. Generate service account key
4. Add security rules

### 2. Environment Variables

**Local (.env):**
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Vercel:**
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` with the service account JSON

### 3. Deploy
```bash
# Deploy Vercel app
git push

# Deploy extension
shopify app deploy
```

## Testing Checklist

- [ ] Firebase service account configured
- [ ] Environment variables set in Vercel
- [ ] App redeployed on Vercel
- [ ] Extension redeployed with `shopify app deploy`
- [ ] Can toggle message on/off in admin
- [ ] Can update custom message text
- [ ] Settings save successfully
- [ ] Extension fetches settings from API
- [ ] Message appears on Thank You page when enabled
- [ ] Message doesn't appear when disabled
- [ ] No console errors in browser or Vercel logs

## Benefits

✅ **No payment barriers** - Free for all merchants
✅ **Persistent storage** - Sessions don't expire on Vercel
✅ **Real-time updates** - Extension fetches live settings
✅ **Scalable** - Firebase handles millions of requests
✅ **Simple** - No billing code complexity
✅ **Reliable** - No session loss between serverless invocations

## Files Modified

### New Files
- `lib/firestore.ts`
- `pages/api/settings/merchant.ts`
- `pages/api/settings/public.ts`
- `FIREBASE_SETUP.md`

### Modified Files
- `package.json` - Added firebase-admin
- `lib/session-storage.ts` - Firestore integration
- `extensions/checkout-reward/src/index.tsx` - API fetching
- `pages/index.tsx` - Simplified UI (old version backed up to `index-old.tsx`)
- `.env` - Added FIREBASE_SERVICE_ACCOUNT_KEY placeholder

### Removed/Deprecated
- `pages/api/billing/*` - Can be deleted after verification
- `pages/api/subscription/*` - Can be deleted after verification
- Billing UI components in `index-old.tsx`

## Next Steps

1. **Follow FIREBASE_SETUP.md** to configure Firebase
2. **Update Vercel environment variables**
3. **Redeploy the extension**: `shopify app deploy`
4. **Test thoroughly** with a development store
5. **Monitor Firebase usage** in Firebase Console
6. **Clean up old billing files** once verified working
