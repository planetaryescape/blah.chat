let lastBranchTransitionAt = 0;

const BRANCH_TRANSITION_WINDOW_MS = 700;

export function markBranchTransition() {
  lastBranchTransitionAt = Date.now();
}

export function hasRecentBranchTransition() {
  return Date.now() - lastBranchTransitionAt < BRANCH_TRANSITION_WINDOW_MS;
}
