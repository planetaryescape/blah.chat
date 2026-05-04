import { useSignIn } from "@clerk/clerk-expo";
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

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState<
    "email" | "password" | "code" | null
  >(null);

  const { run: handleSignIn, isPending: signInLoading } = useAsyncAction(
    async () => {
      if (!isLoaded || !signIn) {
        console.log("[mobile][sign-in] Not ready", {
          isLoaded,
          signIn: !!signIn,
        });
        return;
      }

      setError("");
      console.log("[mobile][sign-in] Attempting sign in for:", email);

      const result = await signIn.create({
        identifier: email,
        password,
      });

      console.log("[mobile][sign-in] Result status:", result.status);

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        console.log("[mobile][sign-in] Session activated, navigating");
        router.replace("/(drawer)/chat/new");
      } else if (
        result.status === "needs_first_factor" ||
        result.status === "needs_second_factor"
      ) {
        const emailFactor = result.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code",
        );
        if (emailFactor && "emailAddressId" in emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          console.log("[mobile][sign-in] Email verification code sent");
          setPendingVerification(true);
        } else {
          console.log(
            "[mobile][sign-in] No email_code factor available:",
            result.supportedFirstFactors,
          );
          setError(
            "This account requires a verification method not yet supported.",
          );
        }
      } else {
        console.log("[mobile][sign-in] Unexpected status:", result.status);
        setError("Unable to complete sign in. Please try again.");
      }
    },
    {
      onError: (err: any) => {
        const msg =
          err?.errors?.[0]?.message || err?.message || "Failed to sign in";
        console.log("[mobile][sign-in] Error:", msg, err);
        setError(msg);
      },
    },
  );

  const { run: handleVerify, isPending: verifyLoading } = useAsyncAction(
    async () => {
      if (!isLoaded || !signIn) return;

      setError("");
      console.log("[mobile][sign-in] Attempting email verification");

      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      console.log("[mobile][sign-in] Verify result:", result.status);

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        console.log("[mobile][sign-in] Session activated, navigating");
        router.replace("/(drawer)/chat/new");
      } else {
        console.log(
          "[mobile][sign-in] Unexpected verify status:",
          result.status,
        );
        setError("Verification incomplete. Please try again.");
      }
    },
    {
      onError: (err: any) => {
        const msg =
          err?.errors?.[0]?.message ||
          err?.message ||
          "Invalid verification code";
        console.log("[mobile][sign-in] Verify error:", msg, err);
        setError(msg);
      },
    },
  );

  const loading = signInLoading || verifyLoading;

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
            <Text style={styles.subtitle}>
              We sent a verification code to {email}
            </Text>
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

          <Pressable
            onPress={() => {
              setPendingVerification(false);
              setCode("");
              setError("");
            }}
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
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
          <Text style={styles.subtitle}>Sign in to your account</Text>
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
              placeholder="Enter your password"
              placeholderTextColor={palette.starlightDim}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
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
