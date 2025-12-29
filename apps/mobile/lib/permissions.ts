import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera Access Required",
      "Please enable camera access in Settings to take photos.",
      [{ text: "OK" }],
    );
    return false;
  }
  return true;
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photo Library Access Required",
      "Please enable photo library access in Settings to attach images.",
      [{ text: "OK" }],
    );
    return false;
  }
  return true;
}

export async function requestAudioPermission(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Microphone Access Required",
      "Please enable microphone access in Settings for voice messages.",
      [{ text: "OK" }],
    );
    return false;
  }
  return true;
}
