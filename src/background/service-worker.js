// Background Service Worker for Inspiration Curator (Manifest V3)

// Listen to Extension Icon Click (chrome.action.onClicked)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  // Prevent injection on restricted internal chrome pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
    return;
  }

  try {
    // Ping tab to check if content script is already injected
    await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' });
  } catch (err) {
    // If not injected yet, inject content script files and then send open message
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['src/content/overlay.css']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content/overlay.js']
    });
    // Now trigger open
    await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' });
  }
});

// Handle messages from content script & side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CAPTURE_VISIBLE_TAB') {
    (async () => {
      try {
        const windowId = sender.tab ? sender.tab.windowId : undefined;
        // Capture screenshot of visible tab as full data URL
        const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
        sendResponse({ success: true, dataUrl });
      } catch (error) {
        console.error('Failed to capture tab:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (message.action === 'SAVE_INSPIRATION') {
    (async () => {
      try {
        const item = message.payload;
        // Load existing inspirations
        const data = await chrome.storage.local.get(['inspirations']);
        const inspirations = data.inspirations || [];
        inspirations.unshift(item); // Prepend new item
        await chrome.storage.local.set({ inspirations });

        // Update badge count
        await chrome.action.setBadgeText({ text: String(inspirations.length) });
        await chrome.action.setBadgeBackgroundColor({ color: '#0A84FF' });

        sendResponse({ success: true });
      } catch (error) {
        console.error('Failed to save inspiration:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.action === 'OPEN_SIDE_PANEL') {
    (async () => {
      try {
        if (sender.tab && sender.tab.windowId) {
          await chrome.sidePanel.open({ windowId: sender.tab.windowId });
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});
