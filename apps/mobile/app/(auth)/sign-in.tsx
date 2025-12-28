import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded) return;

    setLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(drawer)");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View
        className="flex-1 px-6 justify-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground mb-2">
            Welcome back
          </Text>
          <Text className="text-muted-foreground">
            Sign in to continue to blah.chat
          </Text>
        </View>

        {/* Error message */}
        {error ? (
          <View className="bg-destructive/10 rounded-lg px-4 py-3 mb-4">
            <Text className="text-destructive text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#71717a"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="bg-secondary rounded-xl px-4 py-3 text-foreground text-base"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-foreground mb-2">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#71717a"
              secureTextEntry
              className="bg-secondary rounded-xl px-4 py-3 text-foreground text-base"
            />
          </View>

          <Pressable
            onPress={handleSignIn}
            disabled={loading || !email || !password}
            className={`rounded-xl py-4 items-center mt-2 ${
              loading || !email || !password
                ? "bg-primary/50"
                : "bg-primary active:bg-primary/90"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text className="text-primary-foreground font-semibold text-base">
                Sign In
              </Text>
            )}
          </Pressable>
        </View>

        {/* Sign up link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-muted-foreground">Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="text-primary font-medium">Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
