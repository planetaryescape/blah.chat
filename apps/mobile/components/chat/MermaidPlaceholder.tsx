import { GitBranch, Maximize2 } from "lucide-react-native";
import { memo, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { getWebView, webViewAvailable } from "@/lib/webview";
import { MermaidModal } from "./MermaidModal";

interface MermaidPlaceholderProps {
  code: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createInlineMermaidHtml(code: string): string {
  const escapedCode = escapeHtml(code);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" onerror="window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',reason:'cdn_failed'}))"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: transparent;
      overflow: hidden;
    }
    #diagram {
      display: flex;
      justify-content: center;
      padding: 8px;
    }
    .mermaid { max-width: 100%; }
    svg { max-width: 100%; height: auto; }
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
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '${palette.roseQuartz}',
        primaryTextColor: '${palette.void}',
        primaryBorderColor: '${palette.glassBorder}',
        lineColor: '${palette.starlightDim}',
        secondaryColor: '${palette.nebula}',
        tertiaryColor: '${palette.glassLow}',
        background: 'transparent',
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
      flowchart: { nodeSpacing: 50, rankSpacing: 50, curve: 'basis', htmlLabels: true },
      sequence: { actorMargin: 50, boxMargin: 10, messageMargin: 35 },
    });

    mermaid.run({ querySelector: '.mermaid' }).then(() => {
      const el = document.getElementById('diagram');
      const height = el ? el.scrollHeight : 200;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', height }));
    }).catch(() => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', reason: 'render_failed' }));
    });
  </script>
</body>
</html>`;
}

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 400;

function MermaidPlaceholderComponent({ code }: MermaidPlaceholderProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(MIN_HEIGHT);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const WebViewComponent = useMemo(
    () => (webViewAvailable ? getWebView() : null),
    [],
  );

  const html = useMemo(() => createInlineMermaidHtml(code), [code]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === "ready") {
          const h = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, msg.height));
          setWebViewHeight(h);
          setRenderState("ready");
        } else if (msg.type === "error") {
          setRenderState("error");
        }
      } catch {
        setRenderState("error");
      }
    },
    [],
  );

  // Fallback: no WebView or render failed — show tappable card
  if (!WebViewComponent || renderState === "error") {
    return (
      <>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? palette.glassHigh : palette.glassMedium,
            borderRadius: layout.radius.sm,
            padding: spacing.md,
            marginVertical: spacing.sm,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: palette.glassBorder,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <GitBranch size={20} color={palette.roseQuartz} />
            <View>
              <Text
                style={{
                  fontFamily: typography.bodySemiBold,
                  fontSize: 14,
                  color: palette.starlight,
                }}
              >
                Mermaid Diagram
              </Text>
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 12,
                  color: palette.starlightDim,
                }}
              >
                Tap to view
              </Text>
            </View>
          </View>
          <Maximize2 size={18} color={palette.starlightDim} />
        </Pressable>

        <MermaidModal
          visible={modalVisible}
          code={code}
          onClose={() => setModalVisible(false)}
        />
      </>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => ({
          marginVertical: spacing.sm,
          borderRadius: layout.radius.sm,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          backgroundColor: palette.glassMedium,
          overflow: "hidden",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {/* Expand hint */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderBottomWidth: 1,
            borderBottomColor: palette.glassBorder,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <GitBranch size={14} color={palette.starlightDim} />
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 12,
                color: palette.starlightDim,
              }}
            >
              Mermaid Diagram
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 11,
                color: palette.starlightDim,
              }}
            >
              Tap to expand
            </Text>
            <Maximize2 size={12} color={palette.starlightDim} />
          </View>
        </View>

        {/* Inline WebView */}
        <View
          style={{ height: webViewHeight, position: "relative" }}
          pointerEvents="none"
        >
          {renderState === "loading" && (
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
              <ActivityIndicator size="small" color={palette.roseQuartz} />
            </View>
          )}
          <WebViewComponent
            source={{ html }}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              opacity: renderState === "ready" ? 1 : 0,
            }}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            onMessage={handleMessage}
            originWhitelist={["about:blank"]}
            javaScriptEnabled
          />
        </View>
      </Pressable>

      <MermaidModal
        visible={modalVisible}
        code={code}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

export const MermaidPlaceholder = memo(MermaidPlaceholderComponent);
