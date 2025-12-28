import { useSignInWithApple, useSSO } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing, radius } from "@/lib/theme/spacing";

function GoogleIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>G</Text>
    </View>
  );
}

function AppleIcon() {
  return (
    <View style={[styles.iconContainer, styles.appleIconContainer]}>
      <Text style={styles.appleIconText}></Text>
    </View>
  );
}

interface SocialAuthButtonsProps {
  onError?: (error: string) => void;
}

export function SocialAuthButtons({ onError }: SocialAuthButtonsProps) {
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = Linking.createURL("/(drawer)");

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED") return;
      onError?.(err?.errors?.[0]?.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive } =
        await startAppleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED") return;
      onError?.(err?.errors?.[0]?.message || "Apple sign-in failed");
    } finally {
      setAppleLoading(false);
    }
  };

  const isLoading = googleLoading || appleLoading;

  return (
    <View style={styles.container}>
      {/* Google Sign-In */}
      <Pressable
        onPress={handleGoogleSignIn}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.socialButton,
          styles.googleButton,
          isLoading && styles.buttonDisabled,
          pressed && !isLoading && styles.buttonPressed,
        ]}
      >
        {googleLoading ? (
          <ActivityIndicator color={colors.foreground} />
        ) : (
          <>
            <GoogleIcon />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>

      {/* Apple Sign-In (iOS only) */}
      {Platform.OS === "ios" && (
        <Pressable
          onPress={handleAppleSignIn}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.socialButton,
            styles.appleButton,
            isLoading && styles.buttonDisabled,
            pressed && !isLoading && styles.appleButtonPressed,
          ]}
        >
          {appleLoading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <AppleIcon />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.dividerContainer}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or continue with email</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
  },
  appleIconContainer: {
    backgroundColor: "transparent",
  },
  appleIconText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: "#000000",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  googleButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPressed: {
    backgroundColor: colors.secondary,
  },
  googleButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.foreground,
    fontSize: 15,
  },
  appleButton: {
    backgroundColor: "#ffffff",
  },
  appleButtonPressed: {
    backgroundColor: "#f1f1f1",
  },
  appleButtonText: {
    fontFamily: fonts.bodySemibold,
    color: "#000000",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.body,
    color: colors.mutedForeground,
    fontSize: 13,
    marginHorizontal: spacing.md,
  },
});
