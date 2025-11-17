# Deployment Checklist

## Pre-Deployment

- [ ] All dependencies installed (`npm install`)
- [ ] Tests passing (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Environment variables configured in `.env`
- [ ] Shopify app created in Partners dashboard
- [ ] API key and secret obtained

## Vercel Deployment

- [ ] Vercel account created
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Logged into Vercel (`vercel login`)
- [ ] Environment variables added to Vercel dashboard:
  - [ ] `SHOPIFY_API_KEY`
  - [ ] `SHOPIFY_API_SECRET`
  - [ ] `SHOPIFY_SCOPES`
  - [ ] `HOST`
  - [ ] `SHOPIFY_APP_URL`
  - [ ] `ENCRYPTION_SECRET`
  - [ ] `NODE_ENV=production`
- [ ] Deployed to Vercel (`vercel --prod`)
- [ ] Deployment URL noted

## Shopify App Configuration

- [ ] App URL updated to Vercel deployment URL
- [ ] OAuth redirect URL updated to `https://your-app.vercel.app/api/auth/callback`
- [ ] App proxy configured:
  - [ ] Subpath prefix: `apps`
  - [ ] Subpath: `reward-message`
  - [ ] Proxy URL: `https://your-app.vercel.app/api/proxy/reward`
- [ ] App scopes verified

## Shopify Store Setup

- [ ] Liquid code added to Thank You page (Settings → Checkout → Order status page)
- [ ] Test order completed
- [ ] Reward message displays correctly when enabled
- [ ] Message hidden when disabled

## Testing

- [ ] App installation tested
- [ ] OAuth flow working
- [ ] Settings page loads correctly
- [ ] Toggle switch works
- [ ] Metafield updates confirmed
- [ ] Reward message appears on Thank You page
- [ ] Responsive design verified (mobile/desktop)

## Production Considerations

- [ ] Session storage upgraded to persistent database (PostgreSQL/Redis/MongoDB)
- [ ] Error monitoring configured (Sentry/similar)
- [ ] Rate limiting implemented
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Backup strategy in place

## Post-Deployment

- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify all API endpoints responding
- [ ] Test on multiple browsers
- [ ] Document any custom configurations

## Rollback Plan

- [ ] Previous deployment URL saved
- [ ] Database backup taken (if applicable)
- [ ] Rollback procedure documented

---

## Quick Deploy Command

```bash
# One-line deployment
vercel --prod

# With environment check
npm test && npm run lint && vercel --prod
```

## Monitoring Commands

```bash
# Check Vercel deployment status
vercel ls

# View logs
vercel logs

# View deployment details
vercel inspect [deployment-url]
```

## Emergency Rollback

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote [previous-deployment-url]
```
