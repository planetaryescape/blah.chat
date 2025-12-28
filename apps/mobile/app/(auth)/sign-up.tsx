import { useSignUp } from "@clerk/clerk-expo";
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

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!isLoaded) return;

    setLoading(true);
    setError("");

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;

    setLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(drawer)");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-background"
      >
        <View
          className="flex-1 px-6 justify-center"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-foreground mb-2">
              Verify your email
            </Text>
            <Text className="text-muted-foreground">
              We sent a code to {email}
            </Text>
          </View>

          {error ? (
            <View className="bg-destructive/10 rounded-lg px-4 py-3 mb-4">
              <Text className="text-destructive text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="gap-4">
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Verification Code
              </Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#71717a"
                keyboardType="number-pad"
                className="bg-secondary rounded-xl px-4 py-3 text-foreground text-base text-center tracking-widest"
                maxLength={6}
              />
            </View>

            <Pressable
              onPress={handleVerify}
              disabled={loading || code.length < 6}
              className={`rounded-xl py-4 items-center mt-2 ${
                loading || code.length < 6
                  ? "bg-primary/50"
                  : "bg-primary active:bg-primary/90"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <Text className="text-primary-foreground font-semibold text-base">
                  Verify
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

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
            Create account
          </Text>
          <Text className="text-muted-foreground">
            Sign up to get started with blah.chat
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
              placeholder="Create a password"
              placeholderTextColor="#71717a"
              secureTextEntry
              className="bg-secondary rounded-xl px-4 py-3 text-foreground text-base"
            />
          </View>

          <Pressable
            onPress={handleSignUp}
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
                Sign Up
              </Text>
            )}
          </Pressable>
        </View>

        {/* Sign in link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-muted-foreground">Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="text-primary font-medium">Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
