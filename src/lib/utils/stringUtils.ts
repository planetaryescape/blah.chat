/**
 * String Utility Functions
 *
 * Provides string manipulation and comparison utilities.
 */

/**
 * Calculate Levenshtein distance between two strings
 *
 * Measures minimum number of single-character edits (insertions, deletions, substitutions)
 * needed to transform one string into another.
 *
 * Used for fuzzy tag matching to catch typos (e.g., "machne-learning" → "machine-learning")
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (0 = identical, higher = more different)
 *
 * @example
 * levenshteinDistance("kitten", "sitting") // 3
 * levenshteinDistance("machine-learning", "machne-learning") // 1
 */
export function levenshteinDistance(a: string, b: string): number {
  // Create distance matrix
  const matrix: number[][] = [];

  // Initialize first column (distance from empty string)
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row (distance to empty string)
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix using dynamic programming
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        // Characters match - no edit needed
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Take minimum of three operations:
        // 1. Substitution (diagonal)
        // 2. Insertion (left)
        // 3. Deletion (top)
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  // Return bottom-right cell (full distance)
  return matrix[b.length][a.length];
}
