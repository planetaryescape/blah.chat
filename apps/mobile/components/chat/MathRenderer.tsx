import { memo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { palette, spacing } from "@/lib/theme/designSystem";
import { getWebView, webViewAvailable } from "@/lib/webview";

interface MathRendererProps {
  latex: string;
  isBlock?: boolean;
}

function createKatexHtml(latex: string, isBlock: boolean): string {
  const displayMode = isBlock ? "true" : "false";
  const escapedLatex = latex
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: transparent;
      overflow: hidden;
      color: ${palette.starlight};
    }
    #math {
      display: ${isBlock ? "block" : "inline-block"};
      text-align: ${isBlock ? "center" : "left"};
      padding: ${isBlock ? "8px 0" : "0"};
    }
    .katex { font-size: ${isBlock ? "1.2em" : "1em"}; }
    .katex-display { margin: 0; }
  </style>
</head>
<body>
  <div id="math"></div>
  <script>
    try {
      katex.render("${escapedLatex}", document.getElementById("math"), {
        displayMode: ${displayMode},
        throwOnError: false,
        trust: true,
        strict: false
      });
      setTimeout(() => {
        const height = document.getElementById("math").offsetHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({ height }));
      }, 100);
    } catch (e) {
      document.getElementById("math").textContent = "${escapedLatex}";
      window.ReactNativeWebView.postMessage(JSON.stringify({ height: 30 }));
    }
  </script>
</body>
</html>`;
}

// Clean up LaTeX for display when WebView unavailable
function formatLatexFallback(latex: string): string {
  return latex
    .replace(/\\mathrm\{([^}]+)\}/g, "$1") // \mathrm{CO} -> CO
    .replace(/\\text\{([^}]+)\}/g, "$1") // \text{...} -> ...
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)") // \frac{a}{b} -> (a/b)
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)") // \sqrt{x} -> √(x)
    .replace(/\\pm/g, "±")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\infty/g, "∞")
    .replace(/\\pi/g, "π")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\leftarrow/g, "←")
    .replace(/\\[,;!]/g, " ") // spacing commands
    .replace(/_\{([^}]+)\}/g, "₍$1₎") // subscript hint
    .replace(/\^{([^}]+)\}/g, "^($1)") // superscript hint
    .replace(/\\_/g, "_")
    .replace(/\\\\/g, "")
    .trim();
}

// Fallback for when WebView is not available (Expo Go)
function MathFallback({ latex, isBlock }: MathRendererProps) {
  const displayText = formatLatexFallback(latex);

  return (
    <View
      style={{
        backgroundColor: palette.glassMedium,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: isBlock ? 12 : 4,
        marginVertical: isBlock ? spacing.sm : 0,
      }}
    >
      <Text
        style={{
          fontFamily: "Courier",
          fontSize: 13,
          color: palette.roseQuartz,
          textAlign: isBlock ? "center" : "left",
        }}
      >
        {displayText}
      </Text>
    </View>
  );
}

function MathRendererComponent({ latex, isBlock = false }: MathRendererProps) {
  const [height, setHeight] = useState(isBlock ? 60 : 30);
  const [loading, setLoading] = useState(true);

  // If WebView is not available, show fallback
  if (!webViewAvailable) {
    return <MathFallback latex={latex} isBlock={isBlock} />;
  }

  const WebViewComponent = getWebView();
  if (!WebViewComponent) {
    return <MathFallback latex={latex} isBlock={isBlock} />;
  }

  const html = createKatexHtml(latex, isBlock);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.height) {
        setHeight(Math.max(data.height + 8, isBlock ? 40 : 24));
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        height,
        marginVertical: isBlock ? spacing.sm : 0,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
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
          }}
        >
          <ActivityIndicator size="small" color={palette.starlightDim} />
        </View>
      )}
      <WebViewComponent
        source={{ html }}
        style={{ backgroundColor: "transparent", opacity: loading ? 0 : 1 }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        originWhitelist={["*"]}
        javaScriptEnabled
      />
    </View>
  );
}

export const MathRenderer = memo(MathRendererComponent);
