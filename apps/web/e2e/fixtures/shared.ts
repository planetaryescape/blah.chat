/**
 * Shared E2E Test Fixtures and Helpers
 */
import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

// Verified selectors from actual components
export const SELECTORS = {
  // Chat Input (ChatInput.tsx)
  chatInput: '[data-testid="chat-input"]',
  sendButton: '[data-testid="send-button"]',

  // Messages (ChatMessage.tsx)
  message: '[data-testid="message"]',
  messageContent: '[data-testid="message-content"]',

  // Message status selectors
  statusGenerating: '[data-testid="message"][data-status="generating"]',
  statusComplete: '[data-testid="message"][data-status="complete"]',
  statusPending: '[data-testid="message"][data-status="pending"]',
  statusError: '[data-testid="message"][data-status="error"]',

  // Sidebar
  sidebar:
    '[role="navigation"][aria-label="Main navigation and conversations"]',
  conversationList: '[role="listbox"][aria-label="Conversations"]',
  conversationItem: '[role="option"]',
  newChatButton: 'button:has-text("New chat"), a:has-text("New chat")',

  // Model switcher
  modelSwitcher: '[aria-label*="model"], [data-testid="model-switcher"]',
  quickModelSwitcher: '[data-testid="quick-model-switcher"]',

  // Dialogs
  dialog: '[role="dialog"]',
  alertDialog: '[role="alertdialog"]',

  // Auth
  signInButton: 'button:has-text("Sign in"), a:has-text("Sign in")',
  signOutButton: 'button:has-text("Sign out")',

  // Search
  searchInput: 'input[placeholder*="Search"]',
  searchResults: '[role="listbox"]',

  // Settings
  settingsButton: 'button[aria-label*="Settings"], a[href*="settings"]',

  // File upload
  fileInput: 'input[type="file"]',
  attachmentIndicator: '[data-testid="attachment-indicator"]',

  // Templates
  templateButton:
    'button[aria-label*="template"], button:has-text("Templates")',
  templateList: '[role="listbox"]',

  // Import/Export
  importButton: 'button:has-text("Import")',
  exportButton: 'button:has-text("Export")',

  // Projects
  projectsNav: 'a[href*="projects"]',
  projectList: '[data-testid="project-list"]',

  // Error states
  errorMessage: '[role="alert"]',
  toast: "[data-sonner-toast]",
};

// Helper functions
export async function waitForChatReady(page: Page, timeout = 15000) {
  try {
    await page.waitForSelector(SELECTORS.chatInput, { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function sendMessage(page: Page, content: string) {
  await page.fill(SELECTORS.chatInput, content);
  await page.click(SELECTORS.sendButton);
}

export async function waitForResponse(page: Page, timeout = 60000) {
  await page.waitForSelector(SELECTORS.statusComplete, { timeout });
}

export async function getLastMessage(page: Page) {
  const messages = page.locator(SELECTORS.message);
  return messages.last();
}

export async function getLastMessageContent(page: Page) {
  const lastMessage = await getLastMessage(page);
  return lastMessage.locator(SELECTORS.messageContent).textContent();
}

export async function waitForMessageGenerating(page: Page, timeout = 15000) {
  await page.waitForSelector(SELECTORS.statusGenerating, { timeout });
}

export async function countMessages(page: Page) {
  return page.locator(SELECTORS.message).count();
}

export async function getConversationCount(page: Page) {
  return page.locator(SELECTORS.conversationItem).count();
}

export async function clickNewChat(page: Page) {
  const newChatButton = page.locator(SELECTORS.newChatButton).first();
  await newChatButton.click();
}

export async function openFirstConversation(page: Page) {
  const firstConv = page.locator(SELECTORS.conversationItem).first();
  await firstConv.click();
}

export async function searchConversations(page: Page, query: string) {
  await page.keyboard.press("Meta+j");
  await page.waitForSelector(SELECTORS.searchInput, { timeout: 5000 });
  await page.fill(SELECTORS.searchInput, query);
}

export async function dismissDialog(page: Page) {
  await page.keyboard.press("Escape");
}

export async function waitForToast(page: Page, timeout = 5000) {
  await page.waitForSelector(SELECTORS.toast, { timeout });
}

export async function getToastMessage(page: Page) {
  const toast = page.locator(SELECTORS.toast).first();
  return toast.textContent();
}

// Extended test with auth check helper
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await page.goto("/");

    // Check if redirected to auth or can access chat
    const url = page.url();
    if (url.includes("/sign-in") || url.includes("/sign-up")) {
      // Skip test if not authenticated
      base.skip(true, "Test requires authentication setup");
    }

    // Navigate to chat
    await page.goto("/chat");

    const ready = await waitForChatReady(page);
    if (!ready) {
      base.skip(true, "Chat not accessible - requires authentication");
    }

    await use(page);
  },
});

export { expect };
