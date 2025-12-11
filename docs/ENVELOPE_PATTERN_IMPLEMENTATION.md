# Envelope Pattern Implementation

Implementation of consistent API response format (envelope pattern) across all Linganisa platforms.

## Pattern Name
**Response Envelope Pattern** / **Response Wrapping Pattern**

## Implementation Date
November 9, 2025

## Backend (Webapp) ✅

### Utility Created
- `/webapp/src/lib/utils/formatEntity.ts` - Core envelope formatting functions

### Entity Types
- `user-photo` - User photo operations
- `product-image` - Product image uploads
- `product-extraction` - AI/manual product extraction
- `try-on` - Virtual try-on generation
- `try-on-history` - Try-on history items
- `cache-bust` - Cache invalidation
- Built-in: `error`, `empty`, `list`, `generic`

### API Endpoints Updated (12 total)
✅ `/api/upload-user-photo` - Single entity
✅ `/api/list-user-photos` - Entity list
✅ `/api/delete-user-photo` - Empty entity
✅ `/api/upload-product-image` - Single entity
✅ `/api/ai-extract-product` - Single entity
✅ `/api/extract-product` - Single entity
✅ `/api/generate-tryon` - Single entity
✅ `/api/tryon-from-url` - Single entity
✅ `/api/tryon-from-extraction` - Single entity
✅ `/api/get-history` - Entity list
✅ `/api/get-product-tryons` - Entity list
✅ `/api/bust-cache` - Single entity

## Webapp Frontend ✅

### Direct API Calls Updated
✅ `/app/studio/try-on/page.tsx` - extract-product
✅ `/app/studio/my-photos/page.tsx` - upload-user-photo
✅ `/app/studio/my-closet/products/[productKey]/page.tsx` - generate-tryon

### React Query Hooks Updated
✅ `/hooks/useUserPhotos.ts` - list-user-photos
✅ `/hooks/useTryOnHistory.ts` - get-history + list-user-photos

## Extension (Chrome/TypeScript) ✅

### Type Definitions
✅ `/src/lib/types.ts` - Entity<T>, ErrorEntity, EntityList<T>

### API Client
✅ `/src/lib/api-client.ts` - Envelope parsing functions:
- `parseEnvelope<T>()` - Extract data from single entity
- `parseEnvelopeList<T>()` - Extract array from entity list

### Methods Updated (9 total)
✅ `uploadUserPhoto()` - Parses user-photo entity
✅ `listUserPhotos()` - Parses user-photo list
✅ `deleteUserPhoto()` - Parses empty entity
✅ `extractProduct()` - Parses product-extraction entity
✅ `aiExtractProduct()` - Parses product-extraction entity
✅ `tryOnFromExtraction()` - Parses try-on entity
✅ `tryOnFromUrl()` - Parses try-on entity
✅ `getHistory()` - Parses try-on-history list
✅ `bustCache()` - Parses cache-bust entity

### Additional Files
✅ `/src/hooks/use-product-tryons.ts` - Direct fetch envelope parsing
✅ `/background.js` - Extract product envelope parsing

## iOS (Swift) ✅

### Entity Response Types
✅ `/Core/API/EntityResponse.swift` - Complete type system:
- `Entity<T>` - Generic entity wrapper
- `ErrorEntity` - Error responses
- `EntityList<T>` - List responses
- `AnyCodable` - Flexible error decoding

### API Files Updated
✅ `/Core/API/UserAPI.swift`:
- `uploadPhoto()` - Decodes user-photo entity
- `listPhotos()` - Decodes user-photo list

✅ `/Core/API/ProductAPI.swift`:
- `extractProduct()` - Decodes product-extraction entity
- `extractProductWithAI()` - Decodes product-extraction entity

✅ `/Core/API/TryOnAPI.swift`:
- `generateTryOn()` - Decodes try-on entity
- `getHistory()` - Decodes try-on-history list
- `tryOnFromURL()` - Decodes try-on entity

## Response Formats

### Success (Single Entity)
```json
{
  "status": "success",
  "sys": {
    "id": "abc123",
    "entity": "user-photo",
    "createdAt": "2025-11-09T...",
    "updatedAt": "2025-11-09T..."
  },
  "data": {
    "photoId": "abc123",
    "url": "https://..."
  }
}
```

### Success (Entity List)
```json
{
  "status": "success",
  "sys": {
    "entity": "list"
  },
  "data": [
    {
      "sys": { "id": "1", "entity": "user-photo" },
      "data": { "photoId": "1", "url": "..." }
    },
    {
      "sys": { "id": "2", "entity": "user-photo" },
      "data": { "photoId": "2", "url": "..." }
    }
  ]
}
```

### Error
```json
{
  "status": "error",
  "sys": {
    "entity": "error"
  },
  "error": {
    "message": "Error description",
    "details": "Additional context"
  }
}
```

### Empty (Void Operations)
```json
{
  "status": "success",
  "sys": {
    "entity": "empty"
  }
}
```

## Backward Compatibility

All clients implement graceful fallback:
- Check for envelope structure (`status` + `sys` fields)
- Parse envelope format if present
- Fall back to old format if not
- Allows gradual migration without breaking changes

## Benefits

1. **Predictable Structure** - All responses have consistent shape
2. **Type Safety** - Entity<T> enforces proper typing
3. **Metadata** - sys.id, sys.entity for tracking
4. **Error Handling** - Unified error format
5. **Extensibility** - Easy to add new entity types
6. **Debugging** - Clear entity type in every response

## Testing Notes

All platforms maintain backward compatibility, so deployment can be:
1. Deploy backend first (all endpoints support envelope)
2. Update clients gradually (they support both formats)
3. No breaking changes for existing clients

## Files Changed Summary

**Webapp Backend:** 13 files (1 utility + 12 endpoints)
**Webapp Frontend:** 5 files (3 pages + 2 hooks)
**Extension:** 4 files (1 types, 1 api-client, 1 hook, 1 background)
**iOS:** 4 files (1 entity types + 3 API clients)

**Total:** 26 files modified across 4 codebases

