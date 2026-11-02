export function shouldSendOnEnter(
  preferences: { sendOnEnter?: boolean } | undefined,
): boolean {
  return preferences !== undefined && (preferences.sendOnEnter ?? true);
}
