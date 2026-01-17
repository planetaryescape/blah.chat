# File Upload Staging

> **Phase**: P9-features | **Effort**: 4h | **Impact**: Better UX, no orphaned files
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

File uploads currently trigger an immediate save to the database. If a user drops a file by mistake and deletes it, it remains as an orphaned record in storage. Additionally, the immediate upload forces a network wait before the user feels the file is "attached", creating lag between drag-drop and visual feedback.

Also, drag-and-drop is scoped to specific drop zones. Users often drop files anywhere in the browser window expecting it to work.

### Current Behavior

- File dropped → immediate upload to storage
- User must wait for upload before seeing preview
- Deleted files leave orphaned records
- Drag-drop only works in input area

### Expected Behavior

- Instant preview using `createObjectURL`
- Files staged locally until "Send"
- No orphaned storage records
- Global drag-drop anywhere on page

---

## Current Implementation

**File**: `apps/web/src/components/chat/FileUpload.tsx`

Files are uploaded immediately on drop.

---

## Solution

Implement a staging system with deferred upload and global drag-drop.

### Step 1: Create Staging State

**File**: `apps/web/src/components/chat/useStagedFiles.ts`

```typescript
import { useState, useCallback } from 'react';

export interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  mimeType: string;
  uploadProgress?: number;
  error?: string;
}

export function useStagedFiles() {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: StagedFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }));

    setStagedFiles((prev) => [...prev, ...newFiles]);
    return newFiles;
  }, []);

  const removeFile = useCallback((id: string) => {
    setStagedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setStagedFiles([]);
  }, [stagedFiles]);

  const updateProgress = useCallback((id: string, progress: number) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, uploadProgress: progress } : f))
    );
  }, []);

  const setError = useCallback((id: string, error: string) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, error } : f))
    );
  }, []);

  return {
    stagedFiles,
    addFiles,
    removeFile,
    clearFiles,
    updateProgress,
    setError,
    hasFiles: stagedFiles.length > 0,
  };
}
```

### Step 2: Create Global Drop Zone

**File**: `apps/web/src/components/GlobalDropZone.tsx`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalDropZoneProps {
  onDrop: (files: FileList) => void;
  accept?: string[];
  maxSize?: number;
}

export function GlobalDropZone({
  onDrop,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
}: GlobalDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => c + 1);
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => {
      const newCount = c - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = e.dataTransfer?.files;
      if (!files?.length) return;

      // Validate files
      const validFiles = Array.from(files).filter((file) => {
        if (accept && !accept.some((type) => file.type.startsWith(type))) {
          return false;
        }
        if (file.size > maxSize) {
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        const dt = new DataTransfer();
        validFiles.forEach((f) => dt.items.add(f));
        onDrop(dt.files);
      }
    },
    [onDrop, accept, maxSize]
  );

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-50',
            'bg-background/80 backdrop-blur-sm',
            'flex items-center justify-center',
            'border-2 border-dashed border-primary'
          )}
        >
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Drop files to attach</p>
            <p className="text-sm text-muted-foreground">
              Images, documents, and more
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Step 3: File Preview Component

**File**: `apps/web/src/components/chat/StagedFilePreview.tsx`

```typescript
import { X, File, Image, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { StagedFile } from './useStagedFiles';

interface StagedFilePreviewProps {
  files: StagedFile[];
  onRemove: (id: string) => void;
}

export function StagedFilePreview({ files, onRemove }: StagedFilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 border-t">
      {files.map((file) => (
        <FilePreviewItem key={file.id} file={file} onRemove={onRemove} />
      ))}
    </div>
  );
}

function FilePreviewItem({
  file,
  onRemove,
}: {
  file: StagedFile;
  onRemove: (id: string) => void;
}) {
  const isImage = file.mimeType.startsWith('image/');
  const isUploading = file.uploadProgress !== undefined && file.uploadProgress < 100;

  return (
    <div
      className={cn(
        'relative group',
        'w-20 h-20 rounded-lg overflow-hidden',
        'border bg-muted',
        file.error && 'border-destructive'
      )}
    >
      {isImage ? (
        <img
          src={file.previewUrl}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2">
          <FileIcon mimeType={file.mimeType} />
          <span className="text-[10px] truncate w-full text-center mt-1">
            {file.name}
          </span>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {/* Progress bar */}
      {file.uploadProgress !== undefined && (
        <Progress
          value={file.uploadProgress}
          className="absolute bottom-0 left-0 right-0 h-1"
        />
      )}

      {/* Remove button */}
      <Button
        variant="destructive"
        size="icon"
        className={cn(
          'absolute top-1 right-1 w-5 h-5',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        onClick={() => onRemove(file.id)}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="w-6 h-6" />;
  if (mimeType.includes('pdf')) return <FileText className="w-6 h-6" />;
  return <File className="w-6 h-6" />;
}
```

### Step 4: Integrate with Chat Input

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
import { useStagedFiles } from './useStagedFiles';
import { StagedFilePreview } from './StagedFilePreview';
import { GlobalDropZone } from '../GlobalDropZone';

export function ChatInput({ onSend }: ChatInputProps) {
  const { stagedFiles, addFiles, removeFile, clearFiles, updateProgress } =
    useStagedFiles();

  const handleSend = async () => {
    if (!message.trim() && stagedFiles.length === 0) return;

    // Upload staged files
    const uploadedAttachments = await Promise.all(
      stagedFiles.map(async (file) => {
        updateProgress(file.id, 0);

        const storageId = await uploadFile(file.file, (progress) => {
          updateProgress(file.id, progress);
        });

        return {
          storageId,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        };
      })
    );

    // Send message with attachments
    await onSend({
      content: message,
      attachments: uploadedAttachments,
    });

    // Clear staged files
    clearFiles();
    setMessage('');
  };

  return (
    <>
      <GlobalDropZone onDrop={addFiles} />

      <div className="chat-input-container">
        <StagedFilePreview files={stagedFiles} onRemove={removeFile} />

        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <Button onClick={handleSend}>Send</Button>
        </div>
      </div>
    </>
  );
}
```

---

## Testing

### Unit Tests

```typescript
describe('useStagedFiles', () => {
  it('should add files with preview URLs', () => {
    const { result } = renderHook(() => useStagedFiles());

    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    act(() => {
      result.current.addFiles([mockFile]);
    });

    expect(result.current.stagedFiles).toHaveLength(1);
    expect(result.current.stagedFiles[0].previewUrl).toBeDefined();
    expect(result.current.stagedFiles[0].name).toBe('test.txt');
  });

  it('should remove file and revoke URL', () => {
    const revokeObjectURL = jest.spyOn(URL, 'revokeObjectURL');
    const { result } = renderHook(() => useStagedFiles());

    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    act(() => {
      result.current.addFiles([mockFile]);
    });

    const fileId = result.current.stagedFiles[0].id;
    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.stagedFiles).toHaveLength(0);
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});

describe('GlobalDropZone', () => {
  it('should show overlay on drag', () => {
    render(<GlobalDropZone onDrop={jest.fn()} />);

    fireEvent.dragEnter(window, { dataTransfer: { files: [] } });

    expect(screen.getByText('Drop files to attach')).toBeInTheDocument();
  });

  it('should call onDrop with files', () => {
    const onDrop = jest.fn();
    render(<GlobalDropZone onDrop={onDrop} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const dataTransfer = { files: [file] };

    fireEvent.drop(window, { dataTransfer });

    expect(onDrop).toHaveBeenCalled();
  });
});
```

### Manual Testing

1. Drag file anywhere on page → overlay appears
2. Drop file → preview shows immediately (no upload wait)
3. Delete staged file → no orphaned storage record
4. Send message → files upload with progress
5. Cancel send → no orphaned records

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Time to preview | 2-5s (upload) | Instant | 100% faster |
| Orphaned files | Accumulating | Zero | Eliminated |
| Drop target area | Input only | Full page | Better UX |
| Upload feedback | None | Progress bar | Clear status |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (behavior improvement)
- **Memory**: Object URLs cleaned up properly
- **Edge Cases**: Large files, slow connections handled

---

## References

- **Sources**: gemini-cli/feat-file-upload-staging.md, gemini-cli/feat-global-drag-drop.md
- **createObjectURL**: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
- **Related Issues**: P2-input/03-paste-handling.md
