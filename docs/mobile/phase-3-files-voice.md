# Phase 3: File Uploads & Voice

**Duration**: 6-8 hours
**Difficulty**: Intermediate
**Prerequisites**: Phase 2 complete, chat working

---

## Project Context

### What is blah.chat?

blah.chat supports multimodal interactions: images, documents, voice messages, and text-to-speech. This phase implements media capabilities for mobile, leveraging native APIs for camera, audio recording, and speech.

### Architecture: File Storage

**Convex File Storage**:
1. User selects file (image/document)
2. Upload to Convex storage via `generateUploadUrl()`
3. Get `storageId`
4. Attach to message in `attachments` table (normalized)
5. Retrieve via `getUrl(storageId)` for display

**Voice Flow**:
1. Record audio → local file
2. Transcribe via OpenAI/Groq (backend action)
3. Insert transcribed text as message
4. Optional: Store audio as attachment

---

## What You'll Build

By the end of this phase:

✅ Image picker (camera + gallery)
✅ Document file picker
✅ Upload to Convex storage
✅ Attachment previews in messages
✅ Voice recording with waveform
✅ Speech-to-text transcription
✅ Text-to-speech playback
✅ Audio player controls

---

## Current State

**Before This Phase**:
- Text chat working
- Messages send/receive
- Real-time streaming

**After This Phase**:
- Full multimedia support
- Voice messages
- Image sharing
- Document uploads

---

## Step 1: Install Media Dependencies

```bash
npx expo install \
  expo-image-picker \
  expo-document-picker \
  expo-av \
  expo-file-system
```

**Dependencies**:
- `expo-image-picker`: Camera + photo library access
- `expo-document-picker`: File picker for documents
- `expo-av`: Audio recording and playback
- `expo-file-system`: File management

---

## Step 2: Request Permissions

### 2.1 Configure app.json Permissions

Edit `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos",
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera"
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "blah.chat needs camera access to send photos",
        "NSPhotoLibraryUsageDescription": "blah.chat needs photo library access to send images",
        "NSMicrophoneUsageDescription": "blah.chat needs microphone access for voice messages"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO"
      ]
    }
  }
}
```

### 2.2 Create Permission Helper

Create `lib/permissions.ts`:

```typescript
// lib/permissions.ts
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

export async function requestCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Denied',
      'Camera access is required to take photos. Please enable it in Settings.'
    );
    return false;
  }
  return true;
}

export async function requestMediaLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Denied',
      'Photo library access is required. Please enable it in Settings.'
    );
    return false;
  }
  return true;
}

export async function requestAudioPermission() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Denied',
      'Microphone access is required for voice messages. Please enable it in Settings.'
    );
    return false;
  }
  return true;
}
```

---

## Step 3: Add Image Picker to Chat Input

### 3.1 Update ChatInput Component

Edit `components/chat/ChatInput.tsx`:

```typescript
// components/chat/ChatInput.tsx
import { View, TextInput, TouchableOpacity, StyleSheet, ActionSheetIOS, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { requestCameraPermission, requestMediaLibraryPermission } from '@/lib/permissions';

interface Attachment {
  uri: string;
  type: 'image' | 'document';
  name: string;
  mimeType: string;
}

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [height, setHeight] = useState(40);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    onSend(message.trim(), attachments);
    setMessage('');
    setAttachments([]);
    setHeight(40);
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) await handleCamera();
          if (buttonIndex === 2) await handleImageLibrary();
        }
      );
    } else {
      // Android: show both options
      Alert.alert('Add Photo', 'Choose source', [
        { text: 'Take Photo', onPress: handleCamera },
        { text: 'Choose from Library', onPress: handleImageLibrary },
        { text: 'Cancel', style: 'cancel' },
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
          type: 'image',
          name: `photo_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
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
        type: 'image' as const,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const handleDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'application/msword'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([
        ...attachments,
        {
          uri: result.assets[0].uri,
          type: 'document',
          name: result.assets[0].name,
          mimeType: result.assets[0].mimeType || 'application/octet-stream',
        },
      ]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <View style={styles.attachmentPreview}>
          {attachments.map((attachment, index) => (
            <View key={index} style={styles.attachmentItem}>
              {attachment.type === 'image' ? (
                <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
              ) : (
                <View style={styles.documentIcon}>
                  <Ionicons name="document" size={24} color="#0066ff" />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeAttachment(index)}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputContainer}>
        {/* Attachment Buttons */}
        <TouchableOpacity style={styles.iconButton} onPress={showImageOptions}>
          <Ionicons name="camera" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleDocument}>
          <Ionicons name="attach" size={24} color="#666" />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={[styles.input, { height: Math.max(40, Math.min(height, 120)) }]}
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
          style={[
            styles.sendButton,
            (!message.trim() && attachments.length === 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!message.trim() && attachments.length === 0}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  attachmentPreview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  documentIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
```

---

## Step 4: Upload to Convex Storage

### 4.1 Create Upload Helper

Create `lib/convex/upload.ts`:

```typescript
// lib/convex/upload.ts
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import * as FileSystem from 'expo-file-system';

export async function uploadToConvex(
  fileUri: string,
  generateUploadUrl: () => Promise<string>
): Promise<string> {
  // Get upload URL from Convex
  const uploadUrl = await generateUploadUrl();

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to blob
  const response = await fetch(`data:image/jpeg;base64,${base64}`);
  const blob = await response.blob();

  // Upload to Convex storage
  const result = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });

  const { storageId } = await result.json();
  return storageId;
}
```

### 4.2 Update Chat Screen to Handle Uploads

Edit `app/chat/[id].tsx`:

```typescript
// Add to imports
import { uploadToConvex } from '@/lib/convex/upload';

// Add mutation for generating upload URL
const generateUploadUrl = useMutation(api.files.generateUploadUrl);

// Update handleSend
const handleSend = useCallback(
  async (content: string, attachments?: Attachment[]) => {
    // Upload attachments first
    const uploadedAttachments = [];

    if (attachments) {
      for (const attachment of attachments) {
        try {
          const storageId = await uploadToConvex(
            attachment.uri,
            generateUploadUrl
          );
          uploadedAttachments.push({
            storageId,
            name: attachment.name,
            mimeType: attachment.mimeType,
            type: attachment.type,
          });
        } catch (error) {
          console.error('Upload failed:', error);
          Alert.alert('Upload Failed', `Could not upload ${attachment.name}`);
        }
      }
    }

    // Send message with uploaded attachments
    try {
      await sendMessage({
        conversationId,
        content,
        modelId: conversation?.modelId || 'openai:gpt-4o',
        attachments: uploadedAttachments,
      });
    } catch (error) {
      Alert.alert('Failed to send message');
    }
  },
  [conversationId, sendMessage, conversation, generateUploadUrl]
);
```

---

## Step 5: Add Voice Recording

### 5.1 Create Voice Recorder Component

Create `components/chat/VoiceRecorder.tsx`:

```typescript
// components/chat/VoiceRecorder.tsx
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { requestAudioPermission } from '@/lib/permissions';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
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

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setDuration(0);

      // Update duration every second
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setDuration(0);

    if (uri) {
      onRecordingComplete(uri);
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
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (recording) {
    return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
          <Ionicons name="close" size={24} color="#ff3b30" />
        </TouchableOpacity>

        <View style={styles.waveformContainer}>
          <View style={styles.recordingIndicator} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>

        <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
          <Ionicons name="stop" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.micButton} onPress={startRecording}>
      <Ionicons name="mic" size={24} color="#666" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  micButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
  },
  durationText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#fff',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### 5.2 Add to ChatInput

Edit `components/chat/ChatInput.tsx`:

```typescript
// Add import
import { VoiceRecorder } from './VoiceRecorder';

// Add handler
const handleVoiceRecording = async (uri: string) => {
  // Upload audio to Convex
  const storageId = await uploadToConvex(uri, generateUploadUrl);

  // Transcribe via backend action
  const transcription = await transcribeAudio({ storageId });

  // Send transcribed text as message
  onSend(transcription);
};

// Add to input container (before send button)
<VoiceRecorder onRecordingComplete={handleVoiceRecording} />
```

---

## Step 6: Add Text-to-Speech Playback

### 6.1 Create TTS Player Component

Create `components/chat/TTSPlayer.tsx`:

```typescript
// components/chat/TTSPlayer.tsx
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

interface TTSPlayerProps {
  messageId: string;
  text: string;
}

export function TTSPlayer({ messageId, text }: TTSPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

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

    // Generate TTS audio (call backend action)
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
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePlay}>
      <Ionicons
        name={playing ? 'pause' : 'volume-high'}
        size={16}
        color="#0066ff"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
});
```

### 6.2 Add to Message Component

Edit `components/chat/MessageList.tsx`:

```typescript
// Add to assistant messages
{!isUser && item.status === 'complete' && (
  <View style={styles.messageActions}>
    <TTSPlayer messageId={item._id} text={item.content} />
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
- [ ] Audio transcribes to text
- [ ] TTS playback works
- [ ] TTS pause/resume works
- [ ] Audio quality is acceptable

---

## Troubleshooting

### Camera permission denied
**Cause**: User denied permission
**Solution**: Guide user to Settings to enable manually

### Upload fails with "Invalid storage ID"
**Cause**: File format not supported or too large
**Solution**: Check file size limit (10MB), validate mime type

### Voice recording silent
**Cause**: Microphone not configured
**Solution**: Ensure `Audio.setAudioModeAsync` called before recording

### TTS not playing
**Cause**: Audio mode conflicts with recording
**Solution**: Reset audio mode after recording stops

---

## Next Phase Preview

**Phase 4: Projects & Organization** will add:
- Project management
- Notes system with markdown editor
- Bookmarks
- Search functionality
- Tags and categories

**Estimated Time**: 6-8 hours

---

**Next**: [Phase 4: Projects & Organization](./phase-4-projects.md)
