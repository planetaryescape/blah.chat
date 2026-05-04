import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
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
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState<
    "email" | "password" | "code" | null
  >(null);

  const { run: handleSignUp, isPending: signUpLoading } = useAsyncAction(
    async () => {
      if (!isLoaded || !signUp) {
        console.log("[mobile][sign-up] Not ready", {
          isLoaded,
          signUp: !!signUp,
        });
        return;
      }

      setError("");
      console.log("[mobile][sign-up] Attempting sign up for:", email);

      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      console.log("[mobile][sign-up] Verification email sent");
      setPendingVerification(true);
    },
    {
      onError: (err: any) => {
        const msg =
          err?.errors?.[0]?.message || err?.message || "Failed to sign up";
        console.log("[mobile][sign-up] Error:", msg, err);
        setError(msg);
      },
    },
  );

  const { run: handleVerify, isPending: verifyLoading } = useAsyncAction(
    async () => {
      if (!isLoaded || !signUp) {
        console.log("[mobile][sign-up] Not ready for verify", {
          isLoaded,
          signUp: !!signUp,
        });
        return;
      }

      setError("");
      console.log("[mobile][sign-up] Attempting verification");

      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      console.log("[mobile][sign-up] Verify result:", result.status);

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        console.log("[mobile][sign-up] Session activated, navigating");
        router.replace("/(drawer)/chat/new");
      } else {
        console.log("[mobile][sign-up] Unexpected status:", result.status);
        setError("Verification requires additional steps.");
      }
    },
    {
      onError: (err: any) => {
        const msg =
          err?.errors?.[0]?.message ||
          err?.message ||
          "Invalid verification code";
        console.log("[mobile][sign-up] Verify error:", msg, err);
        setError(msg);
      },
    },
  );

  const loading = signUpLoading || verifyLoading;

  if (pendingVerification) {
    const isVerifyDisabled = loading || code.length < 6;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.brandName}>Check your email</Text>
            <Text style={styles.subtitle}>We sent a code to {email}</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                placeholderTextColor={palette.starlightDim}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                onFocus={() => setIsFocused("code")}
                onBlur={() => setIsFocused(null)}
                style={[
                  styles.input,
                  styles.codeInput,
                  isFocused === "code" && styles.inputFocused,
                ]}
                maxLength={6}
              />
            </View>

            <Pressable
              onPress={handleVerify}
              disabled={isVerifyDisabled}
              style={({ pressed }) => [
                styles.button,
                isVerifyDisabled && styles.buttonDisabled,
                pressed && !isVerifyDisabled && styles.buttonPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={palette.void} />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

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
        {/* Brand */}
        <View style={styles.header}>
          <Text style={styles.brandName}>blah.chat</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        {/* Error */}
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
              returnKeyType="next"
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
              placeholder="Create a password"
              placeholderTextColor={palette.starlightDim}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              onFocus={() => setIsFocused("password")}
              onBlur={() => setIsFocused(null)}
              style={[
                styles.input,
                isFocused === "password" && styles.inputFocused,
              ]}
            />
          </View>

          <Pressable
            onPress={handleSignUp}
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
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        {/* Sign in link */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text style={styles.link}>Sign in</Text>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  header: {
    marginBottom: spacing.xl,
  },
  brandName: {
    fontFamily: typography.display,
    fontSize: 32,
    color: palette.starlight,
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.body,
    color: palette.starlightDim,
    fontSize: 15,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: `${palette.error}15`,
    borderRadius: layout.radius.xs,
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
    fontSize: 13,
    color: palette.starlightDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: typography.body,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: layout.radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: palette.starlight,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputFocused: {
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontFamily: typography.bodySemiBold,
    fontSize: 24,
  },
  button: {
    backgroundColor: palette.starlight,
    borderRadius: layout.radius.xs,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: typography.bodySemiBold,
    color: palette.void,
    fontSize: 16,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  linkText: {
    fontFamily: typography.body,
    color: palette.starlightDim,
    fontSize: 14,
  },
  link: {
    fontFamily: typography.bodySemiBold,
    color: palette.starlight,
    fontSize: 14,
  },
});
