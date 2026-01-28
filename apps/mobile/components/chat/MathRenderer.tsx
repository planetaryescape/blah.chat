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
  return (
    latex
      // Text/math mode commands
      .replace(/\\mathrm\{([^}]+)\}/g, "$1")
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathbf\{([^}]+)\}/g, "$1")
      .replace(/\\mathit\{([^}]+)\}/g, "$1")
      .replace(/\\ce\{([^}]+)\}/g, "$1") // chemistry
      // Fractions and roots
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)")
      .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
      // Arrows (must come before general \[cmd])
      .replace(/\\longrightarrow/g, "⟶")
      .replace(/\\longleftarrow/g, "⟵")
      .replace(/\\Longrightarrow/g, "⟹")
      .replace(/\\Longleftarrow/g, "⟸")
      .replace(/\\rightarrow/g, "→")
      .replace(/\\leftarrow/g, "←")
      .replace(/\\Rightarrow/g, "⇒")
      .replace(/\\Leftarrow/g, "⇐")
      .replace(/\\leftrightarrow/g, "↔")
      .replace(/\\uparrow/g, "↑")
      .replace(/\\downarrow/g, "↓")
      // Operators
      .replace(/\\cdot/g, "·")
      .replace(/\\times/g, "×")
      .replace(/\\div/g, "÷")
      .replace(/\\pm/g, "±")
      .replace(/\\mp/g, "∓")
      // Relations
      .replace(/\\leq/g, "≤")
      .replace(/\\geq/g, "≥")
      .replace(/\\neq/g, "≠")
      .replace(/\\approx/g, "≈")
      .replace(/\\equiv/g, "≡")
      .replace(/\\sim/g, "∼")
      // Greek letters
      .replace(/\\alpha/g, "α")
      .replace(/\\beta/g, "β")
      .replace(/\\gamma/g, "γ")
      .replace(/\\delta/g, "δ")
      .replace(/\\epsilon/g, "ε")
      .replace(/\\theta/g, "θ")
      .replace(/\\lambda/g, "λ")
      .replace(/\\mu/g, "μ")
      .replace(/\\pi/g, "π")
      .replace(/\\sigma/g, "σ")
      .replace(/\\omega/g, "ω")
      .replace(/\\Delta/g, "Δ")
      .replace(/\\Sigma/g, "Σ")
      .replace(/\\Omega/g, "Ω")
      // Special symbols
      .replace(/\\infty/g, "∞")
      .replace(/\\partial/g, "∂")
      .replace(/\\nabla/g, "∇")
      .replace(/\\degree/g, "°")
      // Subscripts and superscripts - convert to Unicode where possible
      .replace(/_\{(\d+)\}/g, (_, d) => toSubscript(d))
      .replace(/_(\d)/g, (_, d) => toSubscript(d))
      .replace(/\^\{(\d+)\}/g, (_, d) => toSuperscript(d))
      .replace(/\^(\d)/g, (_, d) => toSuperscript(d))
      .replace(/\^\{([+-])\}/g, (_, s) => (s === "+" ? "⁺" : "⁻"))
      .replace(/\^([+-])/g, (_, s) => (s === "+" ? "⁺" : "⁻"))
      .replace(
        /\^\{(\d+[+-])\}/g,
        (_, d) => toSuperscript(d.slice(0, -1)) + (d.endsWith("+") ? "⁺" : "⁻"),
      )
      // General subscript/superscript hints for non-numeric
      .replace(/_\{([^}]+)\}/g, "₍$1₎")
      .replace(/\^\{([^}]+)\}/g, "^($1)")
      // Spacing and misc
      .replace(/\\[,;!:]/g, " ")
      .replace(/\\ /g, " ")
      .replace(/\\_/g, "_")
      .replace(/\\\\/g, "\n")
      .replace(/\\quad/g, "  ")
      .replace(/\\qquad/g, "    ")
      .trim()
  );
}

// Convert digits to Unicode subscript
function toSubscript(s: string): string {
  const map: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
  };
  return s
    .split("")
    .map((c) => map[c] || c)
    .join("");
}

// Convert digits to Unicode superscript
function toSuperscript(s: string): string {
  const map: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return s
    .split("")
    .map((c) => map[c] || c)
    .join("");
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
