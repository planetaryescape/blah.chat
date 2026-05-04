import { useSignInWithApple, useSSO } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

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

  const { run: handleGoogleSignIn, isPending: googleLoading } = useAsyncAction(
    async () => {
      const redirectUrl = Linking.createURL("/(drawer)/chat/new");

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    },
    {
      onError: (err: any) => {
        if (err?.code === "ERR_CANCELED") return;
        onError?.(err?.errors?.[0]?.message || "Google sign-in failed");
      },
    },
  );

  const { run: handleAppleSignIn, isPending: appleLoading } = useAsyncAction(
    async () => {
      const { createdSessionId, setActive } =
        await startAppleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    },
    {
      onError: (err: any) => {
        if (err?.code === "ERR_CANCELED") return;
        onError?.(err?.errors?.[0]?.message || "Apple sign-in failed");
      },
    },
  );

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
          <ActivityIndicator color={palette.starlight} />
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
    borderRadius: layout.radius.sm,
    backgroundColor: palette.void,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontFamily: typography.bodySemiBold,
    fontSize: 14,
    color: palette.starlight,
  },
  appleIconContainer: {
    backgroundColor: "transparent",
  },
  appleIconText: {
    fontFamily: typography.bodySemiBold,
    fontSize: 18,
    color: "#000000",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: layout.radius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  googleButton: {
    backgroundColor: palette.nebula,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  buttonPressed: {
    backgroundColor: palette.nebula,
  },
  googleButtonText: {
    fontFamily: typography.bodySemiBold,
    color: palette.starlight,
    fontSize: 15,
  },
  appleButton: {
    backgroundColor: "#ffffff",
  },
  appleButtonPressed: {
    backgroundColor: "#f1f1f1",
  },
  appleButtonText: {
    fontFamily: typography.bodySemiBold,
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
    backgroundColor: palette.glassBorder,
  },
  dividerText: {
    fontFamily: typography.body,
    color: palette.starlightDim,
    fontSize: 13,
    marginHorizontal: spacing.md,
  },
});
