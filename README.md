# Inspiration Curator 📸

A minimal, Apple-designed Chrome Extension (Manifest V3) to effortlessly capture web design inspiration and organize it into domain-based folders with realistic macOS animations.

---

## ✨ Features

- **Smart Viewfinder Overlay:** Press `Cmd + Shift + C` (or `Ctrl + Shift + C`) on any webpage to bring up an 8-handle resizable framing box with real-time pixel dimensions.
- **Top-Layer Modal Support:** Uses HTML5 `<dialog>.showModal()` to guarantee the viewfinder works on any website, even over full-screen modals, dialogs, and popups.
- **Camera Shutter Dock:** An Apple Dark glass dock floating below the viewfinder with a camera shutter button and target domain folder badge.
- **macOS Fly-to-Folder Animation:** Capturing triggers an 80ms camera flash; the cropped high-DPI thumbnail scales down and curves into a realistic Aqua macOS folder toast at the bottom-right.
- **Domain Auto-Grouping:** Captures from the same domain are automatically filed under a shared folder named after the website title (with hostname fallback).
- **Apple Dark Side Panel Library:** Clicking the extension icon in your Chrome toolbar opens a clean side panel to browse folders, search by site or domain, and view full-size captures.

---

## 🚀 Installation & Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/Skn1999/inspiration-curator.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select this project's folder.
5. Pin the extension to your toolbar.

---

## ⌨️ Shortcuts & Usage

| Action | Shortcut / Trigger |
|---|---|
| **Start Capture Viewfinder** | `Cmd + Shift + C` (Mac) / `Ctrl + Shift + C` (Windows/Linux) |
| **Open Inspiration Library** | Click the Extension Icon in the toolbar |
| **Capture Area** | Click the circular shutter button on the dock |
| **Close Viewfinder** | Press `Escape` or click the `✕` on the dock |

---

## 🛠️ Tech Stack & Architecture

- **Manifest V3** with Background Service Worker
- **High-DPI Retina Cropping:** Scaled using `window.devicePixelRatio` with HTML5 Canvas 2D
- **Storage:** Offline local-first storage using `chrome.storage.local`
- **UI & Motion Guidelines:** Modeled on Apple Design guidelines (Dark Mode First, monochrome base with blue accents, 200–300ms transitions)
