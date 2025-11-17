# Theme App Extension - Reward Message Block

Your app now includes a **Theme App Extension** that allows merchants to add the reward message to their Thank You page using the theme editor - **no code required!**

## What Changed

### ✅ Embedded App
- App now loads inside Shopify admin (embedded)
- No more external redirects after installation
- Better merchant experience

### ✅ App Block for Thank You Page
- Merchants can add the reward message via theme editor
- Drag and drop positioning
- No manual code pasting required
- Works with Shopify 2.0 themes

## How Merchants Use the App Block

### Step 1: Install the App
```
https://closer-shopify-qq8c.vercel.app/api/auth?shop=YOUR-STORE.myshopify.com
```

### Step 2: Enable via Theme Editor

1. Go to **Online Store** → **Themes** → **Customize**
2. Navigate to **Checkout** → **Order status** page
3. Click **Add block** or **Add app block**
4. Select **Reward Message** from your app
5. The block appears on the page - drag it to position
6. Toggle **"Show reward message"** on/off
7. (Optional) Customize the message text
8. Click **Save**

**That's it!** No code pasting needed.

## File Structure

```
extensions/
└── reward-message-extension/
    ├── shopify.extension.toml     # Extension configuration
    └── blocks/
        └── reward-message.liquid   # The app block template
```

## App Block Features

The block includes:
- **Toggle** - Show/hide the message
- **Custom message** - Merchants can change "You have won a reward!"
- **Automatic styling** - Gradient background, animation
- **Responsive** - Works on all devices

## For Developers

### Testing the Extension Locally

```powershell
# Install Shopify CLI if not already installed
npm install -g @shopify/cli @shopify/app

# Navigate to your app directory
cd closer-shopify-subscription

# Start development server
shopify app dev
```

This will:
1. Start a local server
2. Create a tunnel for Shopify to access your app
3. Update your app configuration
4. Allow you to test the extension in real-time

### Deploying the Extension

The extension is automatically deployed when you:

1. Push to your git repository
2. Shopify Partners dashboard detects the `extensions/` folder
3. Extension becomes available to merchants

**Or manually deploy:**

```powershell
shopify app deploy
```

### Updating the Block

Edit `extensions/reward-message-extension/blocks/reward-message.liquid`:

```liquid
{% if block.settings.enabled %}
  <!-- Your HTML here -->
  <div>{{ block.settings.message }}</div>
{% endif %}

{% schema %}
{
  "name": "Reward Message",
  "target": "order_status",
  "settings": [
    {
      "type": "checkbox",
      "id": "enabled",
      "label": "Show reward message",
      "default": true
    },
    {
      "type": "text",
      "id": "message",
      "label": "Reward message",
      "default": "You have won a reward!"
    }
  ]
}
{% endschema %}
```

## Migration from Liquid Code Method

For merchants currently using the manual Liquid code method:

### Old Method (Still Works)
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

### New Method (Recommended)
1. Remove the Liquid code from **Additional scripts**
2. Use the app block in theme editor instead

**Benefits:**
- ✅ No code to maintain
- ✅ Visual positioning
- ✅ Can customize message
- ✅ Easier to remove/reposition

## Troubleshooting

### App block not appearing in theme editor?

1. **Check app is installed** - Reinstall if necessary
2. **Verify extension is deployed** - Run `shopify app deploy`
3. **Theme compatibility** - Must be Shopify 2.0+ theme
4. **Clear cache** - Refresh theme editor

### Embedded app not loading?

1. **Add `NEXT_PUBLIC_SHOPIFY_API_KEY`** to Vercel environment variables
2. **Must match `SHOPIFY_API_KEY`** - Same value for both
3. **Redeploy** after adding environment variable

### App redirects to external page?

- Ensure `embedded = true` in `shopify.app.toml`
- Check App Bridge is configured in `_app.tsx`
- Verify host parameter in URL

## Environment Variables

Add to Vercel:

```env
SHOPIFY_API_KEY=your_api_key
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key  # Same as above!
SHOPIFY_API_SECRET=your_secret
# ... other variables
```

**Important:** `NEXT_PUBLIC_SHOPIFY_API_KEY` must be added for embedded app to work.

## Documentation

- [Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [App Blocks](https://shopify.dev/docs/apps/online-store/theme-app-extensions/extensions-framework)
- [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge)

---

**Your app is now a modern, embedded Shopify app with drag-and-drop blocks!** 🚀
