// Background Service Worker for Inspiration Curator (Manifest V3)

// 1. Auto-open Side Panel (Folder Dock) whenever user clicks the extension icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 2. Keyboard shortcut listener (Ctrl+Shift+C / Cmd+Shift+C) to start capture viewfinder
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'start_capture') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) return;

    // Prevent injection on restricted internal chrome pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      return;
    }

    await triggerCaptureInTab(tab.id);
  }
});

// Helper to inject/trigger overlay in active tab
async function triggerCaptureInTab(tabId) {
  try {
    // Ping tab to check if content script is already injected
    await chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_OVERLAY' });
  } catch (err) {
    // If not injected yet, inject content script files and then send message
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['src/content/overlay.css']
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/overlay.js']
    });
    await chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_OVERLAY' });
  }
}

// 3. Handle messages from content script & side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Capture visible tab screenshot
  if (message.action === 'CAPTURE_VISIBLE_TAB') {
    (async () => {
      try {
        const windowId = sender.tab ? sender.tab.windowId : undefined;
        const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
        sendResponse({ success: true, dataUrl });
      } catch (error) {
        console.error('Failed to capture tab:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }

  // Trigger capture from Side Panel button
  if (message.action === 'START_CAPTURE_FROM_PANEL') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await triggerCaptureInTab(tab.id);
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Save captured inspiration into chrome.storage.local
  if (message.action === 'SAVE_INSPIRATION') {
    (async () => {
      try {
        const item = message.payload;
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

  // Open Side Panel from content script toast
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
