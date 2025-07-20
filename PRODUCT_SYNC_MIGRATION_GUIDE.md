# Product Sync Migration Guide: REST to GraphQL

## Overview

This guide explains the migration from the deprecated REST Admin API to the GraphQL Admin API for product synchronization, addressing network errors and improving sync reliability.

## Issues Fixed

### 1. REST API Deprecation
- **Problem**: App was using deprecated REST Admin API (deprecated Oct 1, 2024)
- **Solution**: Migrated to GraphQL Admin API with proper error handling

### 2. Network Error Handling
- **Problem**: Network errors causing sync failures
- **Solution**: Implemented robust retry logic with exponential backoff

### 3. Rate Limiting
- **Problem**: REST API rate limits causing sync failures
- **Solution**: GraphQL API with better rate limit handling and progressive delays

### 4. Webhook Reliability
- **Problem**: Webhook failures causing retry storms
- **Solution**: Improved error handling to prevent webhook retry loops

## Changes Made

### New Files Created
- `app/lib/shopify/shopify-graphql-fetcher.server.ts` - GraphQL-based product fetcher

### Files Modified
- `app/routes/api.index.ts` - Updated to use GraphQL fetcher
- `app/routes/webhooks.products.create.tsx` - Improved error handling
- `app/routes/webhooks.products.update.tsx` - Improved error handling
- `app/routes/webhooks.products.delete.tsx` - Improved error handling

## Key Improvements

### 1. GraphQL API Benefits
- **Better Rate Limiting**: Query cost-based instead of request-based
- **Cursor-based Pagination**: More efficient than offset-based
- **Flexible Queries**: Request only needed fields
- **Better Error Handling**: Structured error responses

### 2. Enhanced Error Handling
- **Retry Logic**: Exponential backoff for transient failures
- **Specific Error Messages**: Different handling for different error types
- **Rate Limit Handling**: Specific handling for `THROTTLED` errors
- **Webhook Reliability**: Prevents retry storms

### 3. Performance Improvements
- **Progressive Delays**: Respects rate limits automatically
- **Batch Processing**: Maintains existing batch processing with better error handling
- **Timeout Management**: Proper timeout handling for long-running operations

## Troubleshooting

### Common Issues and Solutions

#### 1. "GraphQL API error. Please check your app permissions."
**Cause**: Missing or insufficient API scopes
**Solution**: 
1. Check `shopify.app.toml` for required scopes
2. Ensure app has `read_products` and `read_product_listings` scopes
3. Reinstall the app if needed

#### 2. "API rate limit exceeded. Please wait and try again."
**Cause**: Hitting GraphQL API rate limits
**Solution**: 
- Wait for rate limit to reset (automatic retry built-in)
- Consider reducing batch size for large syncs
- Check if multiple sync operations are running simultaneously

#### 3. "Authentication error. Please reinstall the app."
**Cause**: Invalid or expired authentication
**Solution**: 
1. Reinstall the app from Shopify admin
2. Check webhook authentication in Shopify settings
3. Verify app is still active in Partner Dashboard

#### 4. "Network error during sync. Please check your connection and try again."
**Cause**: Network connectivity issues
**Solution**: 
- Check internet connection
- Verify Shopify services are operational: https://www.shopifystatus.com/
- Retry sync operation (automatic retry built-in)

#### 5. "Sync operation timed out. Try syncing in smaller batches."
**Cause**: Large number of products causing timeout
**Solution**: 
- Reduce the number of products being synced
- Consider using filters for incremental syncs
- Check if products have large numbers of variants

### Monitoring and Debugging

#### 1. Check Sync Progress
```javascript
// In browser console or API call
fetch('/api/sync-progress?shop=your-shop-domain')
  .then(r => r.json())
  .then(console.log);
```

#### 2. Server Logs
Look for these log patterns:
- `🚀 Starting GraphQL product sync` - Sync started
- `🔄 Using GraphQL Admin API` - Confirming GraphQL usage
- `✅ Completed GraphQL product sync` - Sync completed successfully
- `❌ GraphQL fetch error` - API errors
- `⚠️ GraphQL rate limited` - Rate limiting

#### 3. Webhook Logs
Webhook errors are logged but don't fail the webhook to prevent retry storms:
- Check server logs for webhook processing errors
- Webhooks return 200 even on errors to prevent Shopify retries

## Migration Benefits

### Before (REST API)
- Request-based rate limiting (2 requests/second)
- Offset-based pagination
- Fixed field responses
- Network errors caused complete failures

### After (GraphQL API)
- Query cost-based rate limiting (more flexible)
- Cursor-based pagination (more efficient)
- Flexible field selection
- Robust error handling with automatic retries

## Performance Comparison

### REST API Sync (Before)
```
✓ Fetch Page 1: 250 products (2 requests/second limit)
✓ Fetch Page 2: 250 products (wait 125 seconds)
✗ Network error on Page 3: Complete failure
```

### GraphQL API Sync (After)
```
✓ Fetch Page 1: 250 products (cost-based limiting)
✓ Fetch Page 2: 250 products (progressive delay)
⚠ Rate limited on Page 3: Automatic retry with backoff
✓ Fetch Page 3: 250 products (resumed after backoff)
```

## Testing the Migration

### 1. Test Product Sync
1. Go to your app admin
2. Click "Sync Products"
3. Monitor console logs for GraphQL usage confirmation
4. Check for successful completion

### 2. Test Webhooks
1. Create/update/delete a product in Shopify admin
2. Check server logs for webhook processing
3. Verify products are indexed correctly

### 3. Test Error Handling
1. Temporarily disable internet connection
2. Try syncing products
3. Verify error messages are helpful
4. Restore connection and verify automatic retry

## Best Practices

### 1. Monitoring
- Monitor sync success rates
- Watch for rate limiting patterns
- Track sync duration trends

### 2. Error Handling
- Check server logs regularly
- Set up alerts for high error rates
- Monitor webhook processing success

### 3. Performance
- Avoid multiple simultaneous syncs
- Use incremental syncs when possible
- Monitor GraphQL query costs

## Support

If you continue experiencing issues:

1. Check server logs for specific error messages
2. Verify Shopify service status
3. Test with a smaller product catalog
4. Ensure app permissions are correct
5. Consider reaching out to Shopify support for API-specific issues

## Resources

- [Shopify GraphQL Admin API Documentation](https://shopify.dev/docs/api/admin-graphql)
- [GraphQL Migration Guide](https://shopify.dev/docs/apps/build/graphql/migrate)
- [API Rate Limits](https://shopify.dev/docs/api/usage/limits)
- [Shopify Status Page](https://www.shopifystatus.com/) 