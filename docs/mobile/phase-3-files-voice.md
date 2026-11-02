# Phase 3: Files & Voice

**Duration**: 6-8 hours
**Difficulty**: Intermediate
**Prerequisites**: Phase 2 complete, chat working

---

## What You'll Build

By the end of this phase:

- Image picker (camera + gallery)
- Document file picker
- Upload to Convex storage
- Attachment previews in messages
- Voice recording with timer
- Speech-to-text transcription
- Text-to-speech playback
- Audio player controls

---

## Architecture: File Storage

**Convex File Storage Flow**:

```
1. User selects file (image/document)
   ↓
2. Upload to Convex storage via generateUploadUrl()
   ↓
3. Get storageId
   ↓
4. Attach to message in attachments table (normalized)
   ↓
5. Retrieve via getUrl(storageId) for display
```

**Voice Flow**:

```
1. Record audio → local file
   ↓
2. Upload to Convex storage
   ↓
3. Transcribe via OpenAI Whisper / Groq (backend action)
   ↓
4. Insert transcribed text as message
   ↓
5. Optional: Store audio as attachment
```

---

## Step 1: Install Media Dependencies

```bash
cd apps/mobile
bun add expo-image-picker expo-document-picker expo-av expo-file-system
```

**Dependencies**:
- `expo-image-picker`: Camera + photo library access
- `expo-document-picker`: File picker for documents
- `expo-av`: Audio recording and playback
- `expo-file-system`: File management

---

## Step 2: Configure Permissions

### 2.1 Update app.config.js

Add plugins to `apps/mobile/app.config.js`:

```javascript
plugins: [
  "expo-router",
  "expo-secure-store",
  [
    "expo-image-picker",
    {
      photosPermission: "Allow blah.chat to access your photos",
      cameraPermission: "Allow blah.chat to access your camera",
    },
  ],
  [
    "expo-av",
    {
      microphonePermission: "Allow blah.chat to access your microphone for voice messages",
    },
  ],
],
ios: {
  supportsTablet: true,
  bundleIdentifier: "com.blahchat.mobile",
  infoPlist: {
    NSCameraUsageDescription: "blah.chat needs camera access to send photos",
    NSPhotoLibraryUsageDescription: "blah.chat needs photo library access to send images",
    NSMicrophoneUsageDescription: "blah.chat needs microphone access for voice messages",
  },
},
android: {
  adaptiveIcon: {
    foregroundImage: "./assets/adaptive-icon.png",
    backgroundColor: "#000000",
  },
  package: "com.blahchat.mobile",
  permissions: [
    "CAMERA",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE",
    "RECORD_AUDIO",
  ],
},
```

### 2.2 Create Permission Helper

Create `apps/mobile/lib/permissions.ts`:

```typescript
// lib/permissions.ts
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { Alert } from "react-native";

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission Denied",
      "Camera access is required to take photos. Please enable it in Settings."
    );
    return false;
  }
  return true;
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission Denied",
      "Photo library access is required. Please enable it in Settings."
    );
    return false;
  }
  return true;
}

export async function requestAudioPermission(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission Denied",
      "Microphone access is required for voice messages. Please enable it in Settings."
    );
    return false;
  }
  return true;
}
```

---

## Step 3: Create Upload Helper

Create `apps/mobile/lib/upload.ts`:

```typescript
// lib/upload.ts
import * as FileSystem from "expo-file-system";

interface UploadOptions {
  generateUploadUrl: () => Promise<string>;
  fileUri: string;
  mimeType?: string;
}

export async function uploadToConvex({
  generateUploadUrl,
  fileUri,
  mimeType = "image/jpeg",
}: UploadOptions): Promise<string> {
  // Get upload URL from Convex
  const uploadUrl = await generateUploadUrl();

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to blob
  const response = await fetch(`data:${mimeType};base64,${base64}`);
  const blob = await response.blob();

  // Upload to Convex storage
  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": blob.type },
    body: blob,
  });

  const json = await result.json();
  return json.storageId;
}
```

---

## Step 4: Add Image Picker to Chat Input

### 4.1 Update ChatInput Component

Update `apps/mobile/src/components/chat/ChatInput.tsx`:

```typescript
// src/components/chat/ChatInput.tsx
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  requestCameraPermission,
  requestMediaLibraryPermission,
} from "@/lib/permissions";

interface Attachment {
  uri: string;
  type: "image" | "document";
  name: string;
  mimeType: string;
}

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onModelPress?: () => void;
  currentModel?: string;
}

function getModelDisplayName(modelId?: string): string {
  if (!modelId) return "Select Model";
  const parts = modelId.split(":");
  if (parts.length < 2) return modelId;
  return parts[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ChatInput({ onSend, onModelPress, currentModel }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [height, setHeight] = useState(40);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
    setMessage("");
    setAttachments([]);
    setHeight(40);
  };

  const showImageOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) await handleCamera();
          if (buttonIndex === 2) await handleImageLibrary();
        }
      );
    } else {
      Alert.alert("Add Photo", "Choose source", [
        { text: "Take Photo", onPress: handleCamera },
        { text: "Choose from Library", onPress: handleImageLibrary },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([
        ...attachments,
        {
          uri: result.assets[0].uri,
          type: "image",
          name: `photo_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        },
      ]);
    }
  };

  const handleImageLibrary = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newAttachments = result.assets.map((asset) => ({
        uri: asset.uri,
        type: "image" as const,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const handleDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/plain", "application/msword"],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([
        ...attachments,
        {
          uri: result.assets[0].uri,
          type: "document",
          name: result.assets[0].name,
          mimeType: result.assets[0].mimeType || "application/octet-stream",
        },
      ]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const canSend = message.trim().length > 0 || attachments.length > 0;

  return (
    <View className="bg-background border-t border-border px-4 py-3">
      {/* Model selector button */}
      {onModelPress && (
        <TouchableOpacity
          className="flex-row items-center gap-1 mb-2"
          onPress={onModelPress}
        >
          <Ionicons name="cube-outline" size={14} color="#666" />
          <Text className="text-xs text-muted">
            {getModelDisplayName(currentModel)}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#666" />
        </TouchableOpacity>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <View className="flex-row gap-2 mb-3">
          {attachments.map((attachment, index) => (
            <View key={index} className="relative">
              {attachment.type === "image" ? (
                <Image
                  source={{ uri: attachment.uri }}
                  className="w-15 h-15 rounded-lg bg-card"
                  style={{ width: 60, height: 60 }}
                />
              ) : (
                <View className="w-15 h-15 rounded-lg bg-card items-center justify-center" style={{ width: 60, height: 60 }}>
                  <Ionicons name="document" size={24} color="#0066ff" />
                </View>
              )}
              <TouchableOpacity
                className="absolute -top-2 -right-2 bg-red-500 rounded-full"
                onPress={() => removeAttachment(index)}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-end gap-2">
        {/* Attachment Buttons */}
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={showImageOptions}
        >
          <Ionicons name="camera" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={handleDocument}
        >
          <Ionicons name="attach" size={24} color="#666" />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          className="flex-1 bg-card rounded-2xl px-4 py-2.5 text-base text-foreground border border-border"
          style={{ height: Math.max(40, Math.min(height, 120)) }}
          placeholder="Message..."
          placeholderTextColor="#666"
          value={message}
          onChangeText={setMessage}
          multiline
          onContentSizeChange={(e) => {
            setHeight(e.nativeEvent.contentSize.height);
          }}
        />

        {/* Send Button */}
        <TouchableOpacity
          className={`w-10 h-10 rounded-full bg-primary items-center justify-center ${
            !canSend ? "opacity-40" : ""
          }`}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

---

## Step 5: Update Chat Screen to Handle Uploads

Update `apps/mobile/app/chat/[id].tsx` to handle file uploads:

```typescript
// Add to imports
import { uploadToConvex } from "@/lib/upload";
import { Alert } from "react-native";

// Add mutation for generating upload URL
const generateUploadUrl = useMutation(api.files.generateUploadUrl);

// Update handleSend to upload attachments first
const handleSend = useCallback(
  async (content: string, attachments?: Attachment[]) => {
    const modelId = selectedModel || conversation?.model || "openai:gpt-4o";

    // Upload attachments first
    const uploadedAttachments = [];

    if (attachments) {
      for (const attachment of attachments) {
        try {
          const storageId = await uploadToConvex({
            generateUploadUrl,
            fileUri: attachment.uri,
            mimeType: attachment.mimeType,
          });
          uploadedAttachments.push({
            storageId,
            name: attachment.name,
            mimeType: attachment.mimeType,
            type: attachment.type,
          });
        } catch (error) {
          console.error("Upload failed:", error);
          Alert.alert("Upload Failed", `Could not upload ${attachment.name}`);
        }
      }
    }

    try {
      await sendMessage({
        conversationId,
        content,
        model: modelId,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  },
  [conversationId, sendMessage, conversation, selectedModel, generateUploadUrl]
);
```

---

## Step 6: Add Voice Recording

### 6.1 Create Voice Recorder Component

Create `apps/mobile/src/components/chat/VoiceRecorder.tsx`:

```typescript
// src/components/chat/VoiceRecorder.tsx
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef } from "react";
import { Audio } from "expo-av";
import { requestAudioPermission } from "@/lib/permissions";

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, durationMs: number) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setDuration(0);

      // Update duration every second
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await recording.stopAndUnloadAsync();
    const status = await recording.getStatusAsync();
    const uri = recording.getURI();
    setRecording(null);
    const finalDuration = duration;
    setDuration(0);

    if (uri) {
      onRecordingComplete(uri, finalDuration * 1000);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await recording.stopAndUnloadAsync();
    setRecording(null);
    setDuration(0);
    onCancel?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (recording) {
    return (
      <View className="flex-row items-center gap-3 px-4 py-3">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={cancelRecording}
        >
          <Ionicons name="close" size={24} color="#ff3b30" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border">
          <View className="w-3 h-3 rounded-full bg-red-500" />
          <Text
            className={`text-base text-foreground ${
              Platform.OS === "ios" ? "font-mono" : ""
            }`}
          >
            {formatDuration(duration)}
          </Text>
        </View>

        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-red-500 items-center justify-center"
          onPress={stopRecording}
        >
          <Ionicons name="stop" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      className="w-10 h-10 items-center justify-center"
      onPress={startRecording}
    >
      <Ionicons name="mic" size={24} color="#666" />
    </TouchableOpacity>
  );
}
```

### 6.2 Integrate Voice Recorder into Chat Input

Add voice recording button to ChatInput before the send button:

```typescript
// Add import
import { VoiceRecorder } from "./VoiceRecorder";

// Add state
const [isRecording, setIsRecording] = useState(false);

// Add handler
const handleVoiceRecording = async (uri: string, durationMs: number) => {
  setIsRecording(false);

  // Upload audio to Convex
  const storageId = await uploadToConvex({
    generateUploadUrl,
    fileUri: uri,
    mimeType: "audio/m4a",
  });

  // Transcribe via backend action
  try {
    const transcription = await transcribeAudio({ storageId });
    onSend(transcription);
  } catch (error) {
    console.error("Transcription failed:", error);
    Alert.alert("Transcription Failed", "Could not transcribe audio");
  }
};

// Add before send button
<VoiceRecorder
  onRecordingComplete={handleVoiceRecording}
  onCancel={() => setIsRecording(false)}
/>
```

---

## Step 7: Add Text-to-Speech Playback

### 7.1 Create TTS Player Component

Create `apps/mobile/src/components/chat/TTSPlayer.tsx`:

```typescript
// src/components/chat/TTSPlayer.tsx
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { Audio } from "expo-av";
import { useAction } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";

interface TTSPlayerProps {
  text: string;
}

export function TTSPlayer({ text }: TTSPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const generateTTS = useAction(api.tts.generate);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlay = async () => {
    if (playing && sound) {
      await sound.pauseAsync();
      setPlaying(false);
      return;
    }

    if (sound) {
      await sound.playAsync();
      setPlaying(true);
      return;
    }

    setLoading(true);
    try {
      // Generate TTS audio via backend action
      const audioUrl = await generateTTS({ text });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
        }
      });

      setSound(newSound);
      setPlaying(true);
    } catch (error) {
      console.error("TTS failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      className="w-8 h-8 rounded-full bg-card border border-border items-center justify-center"
      onPress={handlePlay}
      disabled={loading}
    >
      <Ionicons
        name={loading ? "ellipsis-horizontal" : playing ? "pause" : "volume-high"}
        size={14}
        color="#0066ff"
      />
    </TouchableOpacity>
  );
}
```

### 7.2 Add TTS to Message Actions

Update MessageList to include TTS button for assistant messages:

```typescript
// Add import
import { TTSPlayer } from "./TTSPlayer";

// Add to assistant message actions (after copy button)
{!isUser && item.status === "complete" && (
  <View className="flex-row gap-4 mt-2">
    <TouchableOpacity
      className="flex-row items-center gap-1"
      onPress={() => handleCopy(displayContent)}
    >
      <Ionicons name="copy-outline" size={14} color="#666" />
      <Text className="text-xs text-muted">Copy</Text>
    </TouchableOpacity>
    <TTSPlayer text={displayContent} />
  </View>
)}
```

---

## Testing Checklist

- [ ] Camera opens and captures photos
- [ ] Gallery picker selects images
- [ ] Multiple images can be attached
- [ ] Document picker works for PDFs
- [ ] Attachments show preview thumbnails
- [ ] Can remove attachments before sending
- [ ] Images upload to Convex successfully
- [ ] Uploaded images display in messages
- [ ] Voice recording starts and shows timer
- [ ] Recording stops and uploads
- [ ] Audio transcribes to text (requires backend action)
- [ ] TTS playback works (requires backend action)
- [ ] TTS pause/resume works
- [ ] Audio quality is acceptable

---

## Troubleshooting

### Camera permission denied

**Cause**: User denied permission
**Fix**: Guide user to Settings to enable manually

### Upload fails with "Invalid storage ID"

**Cause**: File format not supported or too large
**Fix**: Check file size limit (10MB for Convex), validate mime type

### Voice recording silent

**Cause**: Microphone not configured
**Fix**: Ensure `Audio.setAudioModeAsync` called before recording

### TTS not playing

**Cause**: Audio mode conflicts with recording
**Fix**: Reset audio mode after recording stops:
```typescript
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
});
```

### "Cannot find api.files.generateUploadUrl"

**Cause**: Backend mutation not exported
**Fix**: Ensure `packages/backend/convex/files.ts` exports the mutation

---

## Backend Requirements

This phase requires these backend endpoints (should already exist):

```typescript
// packages/backend/convex/files.ts
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// packages/backend/convex/transcription.ts
export const transcribe = action(async (ctx, { storageId }) => {
  // Call OpenAI Whisper or Groq for transcription
});

// packages/backend/convex/tts.ts
export const generate = action(async (ctx, { text }) => {
  // Call TTS provider (Deepgram, ElevenLabs, etc.)
  // Return audio URL
});
```

---

## Success Criteria

You're ready for V1 launch when:

1. Images can be attached and sent
2. Documents can be attached
3. Voice recording works
4. Transcription works (if backend configured)
5. TTS playback works (if backend configured)

---

## Next Phase Preview

**Phase 4: Projects & Organization** is **V2 - Future Work**.

For V1, the mobile app is complete with:
- Chat with real-time streaming
- RAG/Memories integration
- Multi-model selection (46 models)
- File attachments
- Voice input/output
- Cost tracking via backend

---

**Next**: [Phase 4: Projects & Organization](./phase-4-projects.md) (V2 - Future)
