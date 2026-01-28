import { memo, type ReactNode, useState } from "react";
import { Linking, Text } from "react-native";
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
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    const url = getBibleGatewayUrl(osis);
    Linking.openURL(url);
  };

  return (
    <Text
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        color: palette.roseQuartz,
        textDecorationLine: "underline",
        textDecorationStyle: pressed ? "solid" : "dotted",
      }}
    >
      {children}
    </Text>
  );
}

export const BibleVerseLink = memo(BibleVerseLinkComponent);
