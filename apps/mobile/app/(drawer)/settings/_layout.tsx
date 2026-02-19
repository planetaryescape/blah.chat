import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personalization" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="memory" />
      <Stack.Screen name="knowledge" />
      <Stack.Screen name="api-keys" />
      <Stack.Screen name="integrations" />
      <Stack.Screen name="advanced" />
      <Stack.Screen name="danger-zone" />
    </Stack>
  );
}
