# Extension Authentication Patterns

## Current Setup (No Auth - Public Data Only)

```tsx
// extensions/checkout-reward/src/index.tsx
const response = await fetch(
  `https://closer-shopify-qq8c.vercel.app/api/settings/public?shop=${shop.myshopifyDomain}`
);
```

**Use when:**
- ✅ Only non-sensitive data (enabled flag, public message)
- ✅ Simple, fast, no auth overhead
- ❌ Anyone can call this API with any shop domain

---

## Option 1: HMAC Verification (Checkout Extensions)

**When to use:**
- Extension runs on checkout/thank-you page (not embedded in admin)
- Need moderate security
- Shopify signs the request automatically

**Extension code:**
```tsx
// extensions/checkout-reward/src/index.tsx
import { useApi } from '@shopify/ui-extensions-react/checkout';

function Extension() {
  const { shop, extensionPoint } = useApi();
  
  useEffect(() => {
    async function fetchSettings() {
      // Shopify automatically adds HMAC to URLs from extensions
      const response = await fetch(
        `https://closer-shopify-qq8c.vercel.app/api/settings/secure?shop=${shop.myshopifyDomain}`
        // Shopify appends: &hmac=abc123&timestamp=...
      );
      
      const data = await response.json();
      setSettings(data);
    }
    
    fetchSettings();
  }, [shop.myshopifyDomain]);
}
```

**API verifies:**
- ✅ Request came from Shopify
- ✅ Shop domain hasn't been tampered with
- ✅ Request is recent (timestamp check)

---

## Option 2: Session Token (Admin Embedded Extensions)

**When to use:**
- Extension runs embedded in Shopify admin
- Need full authentication
- Best security for admin contexts

**Extension code:**
```tsx
// For admin embedded extensions
import { useApi, useSessionToken } from '@shopify/ui-extensions-react/admin';

function Extension() {
  const { shop } = useApi();
  const sessionToken = useSessionToken();
  
  useEffect(() => {
    async function fetchSettings() {
      const token = await sessionToken.get();
      
      const response = await fetch(
        `https://closer-shopify-qq8c.vercel.app/api/settings/session-token`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      const data = await response.json();
      setSettings(data);
    }
    
    fetchSettings();
  }, [shop.myshopifyDomain]);
}
```

**Session token contains:**
- ✅ Shop domain (verified by Shopify)
- ✅ User ID (if online token)
- ✅ Expiration time
- ✅ Cryptographically signed by Shopify

---

## Option 3: Authenticated Proxy (Most Secure)

**When to use:**
- Need maximum security
- Extension UI runs in admin
- Want to reuse existing OAuth session

**Flow:**
```
Extension (Admin)
  ↓ (calls admin URL with session cookie)
Shopify Admin App
  ↓ (verifies session via cookie)
Your Backend API (/api/settings/authenticated-proxy)
  ↓ (uses session.accessToken)
Shopify Admin API
  ↓
Returns sensitive data
```

**Extension code:**
```tsx
// Extension loads your app in an iframe, which has session cookies
import { useApi } from '@shopify/ui-extensions-react/admin';

function Extension() {
  const { shop } = useApi();
  
  useEffect(() => {
    async function fetchSettings() {
      // Call your app directly (cookies sent automatically)
      const response = await fetch(
        `https://closer-shopify-qq8c.vercel.app/api/settings/authenticated-proxy`,
        {
          credentials: 'include', // Include cookies
        }
      );
      
      const data = await response.json();
      setSettings(data);
    }
    
    fetchSettings();
  }, [shop.myshopifyDomain]);
}
```

**Benefits:**
- ✅ Uses existing OAuth session
- ✅ No additional tokens needed
- ✅ Works same as admin UI
- ✅ Access to Shopify Admin API via session.accessToken

---

## Comparison Table

| Method | Security | Complexity | Use Case | Location |
|--------|----------|------------|----------|----------|
| **Public** | None | Very Low | Non-sensitive data | Checkout |
| **HMAC** | Medium | Low | Moderate protection | Checkout |
| **Session Token** | High | Medium | Admin extensions | Admin UI |
| **Authenticated Proxy** | Very High | Medium | Maximum security | Admin UI |

---

## Your Current Setup

```typescript
// Current: No auth (fine for public data)
/api/settings/public
  ↓
Returns: { enabled: boolean, message: string }
```

**If you add sensitive data:**

```typescript
// Example: Add discount codes
settings {
  shop: "closer-store-8820.myshopify.com",
  enabled: true,
  message: "Thank you!",
  discountCode: "SECRET20",  // ← Sensitive!
  webhookUrl: "https://...", // ← Sensitive!
}
```

**Then switch to:**
- Option 1 (HMAC) for checkout extensions
- Option 2 (Session Token) for admin extensions
- Option 3 (Proxy) for maximum security

---

## Implementation Guide

1. **Choose authentication method** based on table above
2. **Update API endpoint** to use secure version
3. **Update extension** to send auth credentials
4. **Test thoroughly** with invalid/expired tokens
5. **Monitor logs** for unauthorized access attempts
