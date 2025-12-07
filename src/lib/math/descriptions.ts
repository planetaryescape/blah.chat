/**
 * Semantic pattern library for math accessibility
 * Generates human-readable descriptions from LaTeX source
 *
 * Coverage: 50+ patterns across calculus, linear algebra, statistics, physics
 * Fallback chain: pattern → heuristic → generic
 */

interface MathPattern {
  regex: RegExp;
  describe: (matches: RegExpMatchArray) => string;
}

/**
 * Semantic pattern database - ordered by specificity (most specific first)
 */
export const mathPatterns: MathPattern[] = [
  // ========== CALCULUS ==========

  // Definite integrals
  {
    regex: /\\int_\{(.+?)\}\^\{(.+?)\}(.+?)d([a-z])/,
    describe: (m) =>
      `Integral from ${m[1]} to ${m[2]} of ${m[3]} with respect to ${m[4]}`,
  },

  // Indefinite integrals
  {
    regex: /\\int\s*(.+?)d([a-z])/,
    describe: (m) => `Integral of ${m[1]} with respect to ${m[2]}`,
  },

  // Contour integrals
  {
    regex: /\\oint/,
    describe: () => "Contour integral",
  },

  // Derivatives - Leibniz notation
  {
    regex: /\\frac\{d\}\{d([a-z])\}/,
    describe: (m) => `Derivative with respect to ${m[1]}`,
  },

  {
    regex: /\\frac\{d(.+?)\}\{d([a-z])\}/,
    describe: (m) => `Derivative of ${m[1]} with respect to ${m[2]}`,
  },

  // Partial derivatives
  {
    regex: /\\frac\{\\partial\}\{\\partial\s*([a-z])\}/,
    describe: (m) => `Partial derivative with respect to ${m[1]}`,
  },

  {
    regex: /\\frac\{\\partial(.+?)\}\{\\partial\s*([a-z])\}/,
    describe: (m) => `Partial derivative of ${m[1]} with respect to ${m[2]}`,
  },

  // Gradient
  {
    regex: /\\nabla/,
    describe: () => "Gradient or del operator",
  },

  // Limits
  {
    regex: /\\lim_\{(.+?)\\to\s*(.+?)\}/,
    describe: (m) => `Limit as ${m[1]} approaches ${m[2]}`,
  },

  // ========== SUMMATION & PRODUCTS ==========

  // Summation with bounds
  {
    regex: /\\sum_\{(.+?)\}\^\{(.+?)\}/,
    describe: (m) => `Sum from ${m[1]} to ${m[2]}`,
  },

  // Infinite summation
  {
    regex: /\\sum_\{(.+?)\}\^\{\\infty\}/,
    describe: (m) => `Infinite sum starting from ${m[1]}`,
  },

  // Product with bounds
  {
    regex: /\\prod_\{(.+?)\}\^\{(.+?)\}/,
    describe: (m) => `Product from ${m[1]} to ${m[2]}`,
  },

  // ========== LINEAR ALGEBRA ==========

  // Matrices
  {
    regex: /\\begin\{(b|p|v|B|V|small)?matrix\}/,
    describe: (m) => {
      const type = m[1] || "";
      const prefix =
        type === "b"
          ? "square-bracketed"
          : type === "p"
            ? "parenthesized"
            : type === "v"
              ? "bar-bracketed"
              : "";
      return `${prefix ? prefix + " " : ""}Matrix`.trim();
    },
  },

  // Determinant
  {
    regex: /\\det\s*\((.+?)\)|\\begin\{vmatrix\}/,
    describe: () => "Determinant",
  },

  // Vector
  {
    regex: /\\vec\{(.+?)\}/,
    describe: (m) => `Vector ${m[1]}`,
  },

  // Dot product
  {
    regex: /\\cdot/,
    describe: () => "Dot product",
  },

  // Cross product
  {
    regex: /\\times/,
    describe: () => "Cross product or Cartesian product",
  },

  // Norm
  {
    regex: /\\lVert(.+?)\\rVert|\\norm\{(.+?)\}/,
    describe: (m) => `Norm of ${m[1] || m[2]}`,
  },

  // ========== STATISTICS & PROBABILITY ==========

  // Expected value
  {
    regex: /\\mathbb\{E\}\[(.+?)\]/,
    describe: (m) => `Expected value of ${m[1]}`,
  },

  // Variance
  {
    regex: /\\text\{Var\}\[(.+?)\]/,
    describe: (m) => `Variance of ${m[1]}`,
  },

  // Probability
  {
    regex: /P\((.+?)\)/,
    describe: (m) => `Probability of ${m[1]}`,
  },

  // Conditional probability
  {
    regex: /P\((.+?)\|(.+?)\)/,
    describe: (m) => `Probability of ${m[1]} given ${m[2]}`,
  },

  // Normal distribution
  {
    regex: /\\mathcal\{N\}\((.+?),\s*(.+?)\)/,
    describe: (m) => `Normal distribution with mean ${m[1]} and variance ${m[2]}`,
  },

  // ========== FRACTIONS & ROOTS ==========

  // Fractions
  {
    regex: /\\frac\{(.+?)\}\{(.+?)\}/,
    describe: (m) => `Fraction: ${m[1]} over ${m[2]}`,
  },

  // Square root
  {
    regex: /\\sqrt\{(.+?)\}/,
    describe: (m) => `Square root of ${m[1]}`,
  },

  // nth root
  {
    regex: /\\sqrt\[(.+?)\]\{(.+?)\}/,
    describe: (m) => `${m[1]}-th root of ${m[2]}`,
  },

  // ========== SET THEORY ==========

  // Union
  {
    regex: /\\cup/,
    describe: () => "Set union",
  },

  // Intersection
  {
    regex: /\\cap/,
    describe: () => "Set intersection",
  },

  // Subset
  {
    regex: /\\subset/,
    describe: () => "Subset relation",
  },

  // Element of
  {
    regex: /\\in/,
    describe: () => "Element of",
  },

  // Empty set
  {
    regex: /\\emptyset/,
    describe: () => "Empty set",
  },

  // ========== LOGIC ==========

  // Universal quantifier
  {
    regex: /\\forall/,
    describe: () => "For all",
  },

  // Existential quantifier
  {
    regex: /\\exists/,
    describe: () => "There exists",
  },

  // Implication
  {
    regex: /\\Rightarrow|\\implies/,
    describe: () => "Implies",
  },

  // Equivalence
  {
    regex: /\\Leftrightarrow|\\iff/,
    describe: () => "If and only if",
  },

  // Negation
  {
    regex: /\\neg/,
    describe: () => "Not",
  },

  // ========== GREEK LETTERS (contextual) ==========

  // Statistical expressions
  {
    regex: /\\(mu|sigma|alpha|beta|gamma|delta)/,
    describe: (m) => {
      const letter = m[1];
      if (letter === "mu") return "Statistical parameter mu";
      if (letter === "sigma") return "Standard deviation sigma";
      if (letter === "alpha" || letter === "beta")
        return "Statistical parameter";
      return "Greek letter expression";
    },
  },

  // Angles
  {
    regex: /\\(theta|phi|psi)/,
    describe: () => "Angle expression",
  },

  // ========== CHEMISTRY (mhchem) ==========

  // Chemical formula
  {
    regex: /\\ce\{(.+?)\}/,
    describe: (m) => `Chemical formula: ${m[1]}`,
  },

  // Physical unit
  {
    regex: /\\pu\{(.+?)\}/,
    describe: (m) => `Physical unit: ${m[1]}`,
  },

  // ========== SPECIAL SYMBOLS ==========

  // Infinity
  {
    regex: /\\infty/,
    describe: () => "Expression involving infinity",
  },

  // Approximately equal
  {
    regex: /\\approx/,
    describe: () => "Approximately equal to",
  },

  // Proportional
  {
    regex: /\\propto/,
    describe: () => "Proportional to",
  },
];

/**
 * Heuristic fallback patterns (simpler, broader matching)
 */
const heuristicPatterns: { test: (latex: string) => boolean; label: string }[] =
  [
    { test: (s) => s.includes("\\int"), label: "Integral expression" },
    { test: (s) => s.includes("\\sum"), label: "Summation" },
    { test: (s) => s.includes("\\prod"), label: "Product" },
    { test: (s) => s.includes("\\frac"), label: "Fraction" },
    { test: (s) => s.includes("\\sqrt"), label: "Root expression" },
    {
      test: (s) => s.includes("matrix"),
      label: "Matrix or array expression",
    },
    { test: (s) => s.includes("\\lim"), label: "Limit expression" },
    { test: (s) => s.includes("\\partial"), label: "Partial derivative" },
    {
      test: (s) =>
        s.includes("\\mathbb{E}") ||
        s.includes("\\text{Var}") ||
        s.includes("\\sigma"),
      label: "Statistical expression",
    },
    {
      test: (s) =>
        s.includes("\\Rightarrow") ||
        s.includes("\\Leftarrow") ||
        s.includes("\\iff"),
      label: "Logical implication",
    },
    {
      test: (s) => s.includes("\\cup") || s.includes("\\cap"),
      label: "Set operation",
    },
  ];

/**
 * Generate semantic description for LaTeX expression
 * Falls back through: pattern → heuristic → generic
 */
export function getDescription(latex: string): string {
  if (!latex) return "Mathematical expression";

  // Try semantic patterns first (most specific)
  for (const pattern of mathPatterns) {
    const match = latex.match(pattern.regex);
    if (match) {
      return pattern.describe(match);
    }
  }

  // Try heuristic patterns (broader)
  for (const heuristic of heuristicPatterns) {
    if (heuristic.test(latex)) {
      return heuristic.label;
    }
  }

  // Final fallback
  return "Mathematical expression";
}

/**
 * Check if LaTeX likely contains display math (for context)
 */
export function isDisplayMath(latex: string): boolean {
  return (
    latex.includes("\\[") ||
    latex.includes("\\begin{") ||
    latex.includes("\\int") ||
    latex.includes("\\sum") ||
    latex.includes("matrix")
  );
}
