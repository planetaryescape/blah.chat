# Logging with Pino

## Overview

blah.chat uses [Pino](https://getpino.io/) for structured, high-performance logging throughout the backend.

## Features

- ✅ Structured JSON logs
- ✅ ~~Pretty console output in development~~ JSON output (pino-pretty disabled to prevent worker crashes)
- ✅ Module-based child loggers
- ✅ Request tracing with unique IDs
- ✅ Duration tracking for operations
- ✅ Automatic error serialization

## Important: Next.js Compatibility

⚠️ **Note:** `pino-pretty` transport is disabled in Next.js environments to prevent "worker has exited" errors. In development, logs are JSON formatted but still readable. This is a known issue with Turbopack/Next.js and Pino transports that use worker threads.

## Configuration

### Log Levels

Configured in `src/lib/logger.ts`:

```typescript
// Development: debug, info, warn, error
// Production: info, warn, error

// Override with environment variable:
LOG_LEVEL=debug bun dev
```

### Development Output

JSON logs with timestamps (pino-pretty disabled):

```json
{"level":"info","time":"2024-01-01T10:23:45.123Z","env":"development","module":"upload-user-photo","photoId":"abc-123","msg":"Starting photo upload"}
{"level":"debug","time":"2024-01-01T10:23:45.234Z","env":"development","module":"upload-user-photo","photoId":"abc-123","fileName":"photo.jpg","fileSize":1024000,"fileType":"image/jpeg","msg":"File received"}
```

### Production Output

Compact JSON for log aggregation:

```json
{"level":"info","time":1234567890,"module":"upload-user-photo","photoId":"abc-123","msg":"Starting photo upload"}
```

## Usage

### Create a Logger

```typescript
import { createLogger } from "@/lib/logger";

const logger = createLogger("module-name");
```

### Log Levels

```typescript
// DEBUG - Detailed diagnostic info
logger.debug({ data }, "Processing started");

// INFO - General informational messages
logger.info({ duration: 123 }, "Operation completed");

// WARN - Warning messages
logger.warn({ userId }, "User not found");

// ERROR - Error conditions
logger.error({ error: err.message, stack: err.stack }, "Operation failed");
```

### Structured Data

Always include relevant context:

```typescript
logger.info(
  {
    photoId,
    duration,
    url: photo.url,
    metadata: {
      width: 1024,
      height: 768,
    },
  },
  "Photo upload completed",
);
```

## Logging Locations

### API Routes

All API routes log:
- Request start (INFO)
- Request parameters (DEBUG)
- Validation failures (WARN)
- Processing steps (DEBUG)
- Success/failure (INFO/ERROR)
- Duration tracking

**Example:** `src/app/api/upload-user-photo/route.ts`

```typescript
const logger = createLogger("upload-user-photo");

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const photoId = uuidv4();

  logger.info({ photoId }, "Starting photo upload");

  // ... processing ...

  const duration = Date.now() - startTime;
  logger.info({ photoId, duration }, "Photo upload completed");
}
```

### Library Functions

**AI Client** (`src/lib/ai-client.ts`):
- Model initialization
- Image preparation
- API requests
- Errors with context

**Image Processor** (`src/lib/image-processor.ts`):
- Processing operations
- Size transformations
- Download operations

## Best Practices

### 1. Always Include Request IDs

```typescript
const photoId = uuidv4();
logger.info({ photoId }, "Starting operation");
// Use photoId in all subsequent logs
```

### 2. Track Duration

```typescript
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;
logger.info({ duration }, "Operation completed");
```

### 3. Log Errors Properly

```typescript
try {
  // operation
} catch (error) {
  logger.error(
    {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      // Include relevant context
      photoId,
      fileName,
    },
    "Operation failed"
  );
  throw error;
}
```

### 4. Don't Log Sensitive Data

❌ **Never log:**
- API keys
- User passwords
- Credit card numbers
- Personal identifying information (in production)

✅ **Safe to log:**
- Request IDs
- Timestamps
- File sizes
- Operation durations
- Error messages

### 5. Use Appropriate Log Levels

- **DEBUG**: Internal details for debugging
- **INFO**: Important business events
- **WARN**: Unusual but handled situations
- **ERROR**: Failures requiring attention

## Viewing Logs

### Development

```bash
bun dev
# Logs appear in console with pretty formatting
```

### Production

Logs are JSON - use a log aggregation service:

- **Vercel**: Built-in log streaming
- **Datadog**: APM + log aggregation
- **LogDNA/Mezmo**: Specialized log service
- **CloudWatch**: AWS-based logging

Example query for errors:
```json
{ "level": "error", "module": "generate-tryon" }
```

## Environment Variables

```bash
# Set log level (default: debug in dev, info in prod)
LOG_LEVEL=debug

# Or per-module (if needed in future)
LOG_LEVEL_API=info
LOG_LEVEL_AI=debug
```

## Performance

Pino is one of the fastest Node.js loggers:
- Asynchronous logging
- Minimal overhead
- JSON serialization optimized

In production, consider:
- Log sampling for high-traffic endpoints
- Log rotation if writing to files
- Shipping logs to external service

## Examples

### Successful Request Flow

```
INFO  (upload-user-photo): Starting photo upload
      photoId: "abc-123"

DEBUG (upload-user-photo): File received
      fileName: "user.jpg", fileSize: 2048000

DEBUG (upload-user-photo): Converting to buffer
      bufferSize: 2048000

DEBUG (image-processor): Starting image processing
      inputSize: 2048000, maxWidth: 1024

DEBUG (image-processor): Image processing completed
      outputSize: 512000

DEBUG (upload-user-photo): Uploading to Convex storage
      blobSize: 512000

INFO  (upload-user-photo): Photo upload completed successfully
      photoId: "abc-123", duration: 1234, url: "https://..."
```

### Error Flow

```
INFO  (generate-tryon): Starting try-on generation
      tryOnId: "xyz-789"

WARN  (generate-tryon): User photo not found
      tryOnId: "xyz-789", userPhotoId: "invalid-id"

ERROR (generate-tryon): Try-on generation failed
      tryOnId: "xyz-789", duration: 45,
      error: "User photo not found"
```

## Troubleshooting

### Logs Not Appearing

Check log level:
```bash
LOG_LEVEL=debug bun dev
```

### Too Verbose

Reduce log level:
```bash
LOG_LEVEL=info bun dev
```

### Production Logs Not Structured

Ensure `NODE_ENV=production` is set.

