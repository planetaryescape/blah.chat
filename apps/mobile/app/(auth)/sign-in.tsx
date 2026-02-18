import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AuthDivider,
  SocialAuthButtons,
} from "@/components/auth/SocialAuthButtons";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState<"email" | "password" | null>(null);

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
        router.replace("/(drawer)/chat/new");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !email || !password;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom },
        ]}
      >
        {/* Brand Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Sparkles size={28} color={palette.roseQuartz} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to blah.chat</Text>
        </View>

        {/* Social Auth */}
        <SocialAuthButtons onError={setError} />

        {/* Divider */}
        <AuthDivider />

        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.starlightDim}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onFocus={() => setIsFocused("email")}
              onBlur={() => setIsFocused(null)}
              style={[
                styles.input,
                isFocused === "email" && styles.inputFocused,
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={palette.starlightDim}
              secureTextEntry
              onFocus={() => setIsFocused("password")}
              onBlur={() => setIsFocused(null)}
              style={[
                styles.input,
                isFocused === "password" && styles.inputFocused,
              ]}
            />
          </View>

          <Pressable
            onPress={handleSignIn}
            disabled={isDisabled}
            style={({ pressed }) => [
              styles.button,
              isDisabled && styles.buttonDisabled,
              pressed && !isDisabled && styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={palette.void} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Sign up link */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: layout.radius.md,
    backgroundColor: palette.nebula,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.heading,
    fontSize: 28,
    color: palette.starlight,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: typography.body,
    color: palette.starlightDim,
    fontSize: 15,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: `${palette.error}15`,
    borderRadius: layout.radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: typography.body,
    color: palette.error,
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.starlight,
  },
  input: {
    fontFamily: typography.body,
    backgroundColor: palette.nebula,
    borderRadius: layout.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: palette.starlight,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  inputFocused: {
    borderColor: palette.roseQuartz,
  },
  button: {
    backgroundColor: palette.roseQuartz,
    borderRadius: layout.radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontFamily: typography.bodySemiBold,
    color: palette.void,
    fontSize: 16,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  linkText: {
    fontFamily: typography.body,
    color: palette.starlightDim,
    fontSize: 14,
  },
  link: {
    fontFamily: typography.bodySemiBold,
    color: palette.roseQuartz,
    fontSize: 14,
  },
});
