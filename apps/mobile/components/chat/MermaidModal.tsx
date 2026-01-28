import { X } from "lucide-react-native";
import { memo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { getWebView, webViewAvailable } from "@/lib/webview";

interface MermaidModalProps {
  visible: boolean;
  code: string;
  onClose: () => void;
}

function createMermaidHtml(code: string): string {
  const escapedCode = code
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: ${palette.void};
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
    }
    #diagram {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .mermaid {
      max-width: 100%;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div id="diagram">
    <pre class="mermaid">
${escapedCode}
    </pre>
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '${palette.roseQuartz}',
        primaryTextColor: '${palette.void}',
        primaryBorderColor: '${palette.glassBorder}',
        lineColor: '${palette.starlightDim}',
        secondaryColor: '${palette.nebula}',
        tertiaryColor: '${palette.glassLow}',
        background: '${palette.void}',
        mainBkg: '${palette.nebula}',
        secondBkg: '${palette.obsidian}',
        border1: '${palette.glassBorder}',
        border2: '${palette.glassBorder}',
        arrowheadColor: '${palette.starlight}',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        textColor: '${palette.starlight}',
        nodeTextColor: '${palette.starlight}',
      },
      flowchart: {
        nodeSpacing: 50,
        rankSpacing: 50,
        curve: 'basis',
        htmlLabels: true,
      },
      sequence: {
        actorMargin: 50,
        boxMargin: 10,
        messageMargin: 35,
      },
    });

    setTimeout(() => {
      window.ReactNativeWebView.postMessage('ready');
    }, 500);
  </script>
</body>
</html>`;
}

// Fallback for when WebView is not available (Expo Go)
function MermaidFallback({
  code,
  onClose,
}: {
  code: string;
  onClose: () => void;
}) {
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: palette.glassBorder,
        }}
      >
        <Text
          style={{
            fontFamily: typography.bodySemiBold,
            fontSize: 16,
            color: palette.starlight,
          }}
        >
          Mermaid Diagram (Raw)
        </Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            padding: spacing.sm,
            backgroundColor: palette.glassMedium,
            borderRadius: layout.radius.full,
          })}
        >
          <X size={20} color={palette.starlight} />
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1, padding: spacing.md }}>
        <Text
          style={{
            fontFamily: "Courier",
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          {code}
        </Text>
      </ScrollView>
    </>
  );
}

function MermaidModalComponent({ visible, code, onClose }: MermaidModalProps) {
  const [loading, setLoading] = useState(true);

  // Check WebView availability
  const WebViewComponent = webViewAvailable ? getWebView() : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.void }}>
        {!WebViewComponent ? (
          <MermaidFallback code={code} onClose={onClose} />
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                padding: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: palette.glassBorder,
              }}
            >
              <Pressable
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  padding: spacing.sm,
                  backgroundColor: palette.glassMedium,
                  borderRadius: layout.radius.full,
                })}
              >
                <X size={20} color={palette.starlight} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              {loading && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1,
                  }}
                >
                  <ActivityIndicator size="large" color={palette.roseQuartz} />
                </View>
              )}
              <WebViewComponent
                source={{ html: createMermaidHtml(code) }}
                style={{ flex: 1, backgroundColor: palette.void }}
                scrollEnabled
                showsHorizontalScrollIndicator
                showsVerticalScrollIndicator
                onMessage={() => setLoading(false)}
                onLoadEnd={() => setLoading(false)}
                originWhitelist={["*"]}
                javaScriptEnabled
                scalesPageToFit
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export const MermaidModal = memo(MermaidModalComponent);
