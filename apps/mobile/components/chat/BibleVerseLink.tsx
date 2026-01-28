import { memo, type ReactNode } from "react";
import { Linking, Pressable, Text } from "react-native";
import { palette } from "@/lib/theme/designSystem";

interface BibleVerseLinkProps {
  osis: string;
  children: ReactNode;
}

function getBibleGatewayUrl(osis: string): string {
  // Convert OSIS reference to BibleGateway format
  // e.g., "John.3.16" -> "John+3:16"
  const ref = osis.replace(/\./g, "+").replace(/\+(\d+)\+/g, "+$1:");
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NIV`;
}

function BibleVerseLinkComponent({ osis, children }: BibleVerseLinkProps) {
  const handlePress = () => {
    const url = getBibleGatewayUrl(osis);
    Linking.openURL(url);
  };

  return (
    <Pressable onPress={handlePress}>
      {({ pressed }) => (
        <Text
          style={{
            color: palette.link,
            textDecorationLine: pressed ? "underline" : "none",
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export const BibleVerseLink = memo(BibleVerseLinkComponent);
