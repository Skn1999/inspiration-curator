# Product Requirements Document (PRD)
## Project: Inspiration Curator (Chrome Extension)

**Status:** Draft / Brainstorming  
**Author:** Sumit Kumar & Antigravity  
**Date:** March 2025  

---

### 1. Overview & Vision
Designers, engineers, researchers, and creative thinkers constantly find inspiration across the web—from captivating micro-interactions, layout typography, animations, color palettes, and video clips to specific functional patterns. Currently, saving this inspiration is fragmented across screenshots on the desktop, bookmarks lost in folders, Notion clipboards, or screen recordings that lack context and metadata.

**Inspiration Curator** is a browser extension that makes capturing visual, motion, and contextual web inspiration effortless. It turns transient web browsing into a structured, searchable, high-fidelity library of creative assets enriched with rich contextual metadata.

---

### 2. Core Problem Statements
1. **Friction in Capture:** Taking a screenshot, cropping it, finding the file, and pasting it somewhere takes you out of the creative flow.
2. **Loss of Context:** Static screenshots lose key context—what website was this from? What was the exact font, palette, URL, responsive viewport, or date?
3. **Motion is Hard to Capture:** Web design today is defined by micro-interactions, transitions, and motion graphics. Capturing a 3-second hover effect or dynamic transition currently requires starting an external screen recorder (QuickTime/CleanShot), recording, trimming, converting to GIF/MP4, and saving manually.
4. **Scattered Storage:** Media ends up in Downloads folders or scattered boards without uniform tagging, search, or easy exports to tools like Notion, Figma, or local folders.

---

### 3. User Personas
- **UI/UX & Product Designers:** Looking for interaction patterns, micro-animations, typography pairings, hero sections, and UI components.
- **Frontend Engineers & Creative Developers:** Capturing CSS/WebGL animations, creative layouts, shaders, and video loops for technical reference.
- **Founders & Product Managers:** Collecting onboarding flows, pricing page designs, landing page copy, and value proposition structures.

---

### 4. Key Brainstormed Solutions & Features

#### A. Multi-Modal Capture Engine
1. **Area / Element Snapping (Static Screenshots):**
   - Click & drag marquee capture (with crosshairs and size indicators).
   - "Smart Element Select" (hovering highlights DOM containers like cards, hero banners, or navigation bars and snaps with 1 click).
   - Full-page screenshot stitching option.
2. **Motion & Interaction Capture (The "How to capture motion" solution):**
   - **Tab Capture Stream + Offscreen Recorder:** Uses Chrome's `tabCapture` stream passed to an Offscreen Document running `MediaRecorder`.
   - **Pre-set Snippet Trimmer / Quick Capture (e.g., 5s / 10s loop):** Click "Record Motion", perform hover/click interaction, click stop. Output converted/stored as high-quality lightweight WebM / MP4 or optimized loop.
   - **Area Motion Cropping:** Record the selected bounding box directly so the recording isolates just the button or animated component rather than the whole screen.
3. **Video / Embed Media Extraction:**
   - Detect native `<video>` elements, YouTube/Vimeo embeds, canvas/Lottie animations, or background videos on the page.
   - 1-click "Extract Direct Video Source" or stream link without having to inspect DevTools.

#### B. Automatic Metadata Enrichment
Whenever a capture occurs, automatically extract and bundle:
- **Origin & Temporal Context:** Page URL, Page Title, Favicon, Timestamp, Viewport Dimensions (e.g., 1440x900).
- **Design Tokens & CSS Extraction (Optional Pro Feature):**
  - Primary font families used in the captured element.
  - Dominant color palette extracted from the screenshot or CSS computed styles.
  - CSS snippet (border-radius, box-shadow, transitions, CSS variables).
- **Page Snapshot / WayBack Reference:** Original URL + semantic meta tags (OpenGraph title, description).

#### C. In-Browser Curation & Storage
- **Automatic Domain-Based Folder Organization (MVP Requirement):**
  - Content captured from the same domain is automatically grouped together into a dedicated folder.
  - **Folder Naming Hierarchy:**
    1. Primary: Captured from the Website / Document Title (`document.title` or OpenGraph site name, cleaned of extraneous tab counts or notification markers).
    2. Fallback: If title extraction is blank, missing, or fails, gracefully reverts to the site hostname / URL (e.g., `stripe.com`, `linear.app`).
  - Users can browse folders, view item counts per site, or create custom manual folders in later steps.
- **Quick-Tag & Notes Toast/Overlay:** Immediately after capture, a subtle non-intrusive floating pill appears:
  - Displays target destination folder (e.g. `📁 Stripe Documentation`).
  - Add tags (e.g., `#HeroSection`, `#MicroInteraction`, `#Onboarding`).
  - Add a quick note ("Check hover animation on CTA").
- **Local-First Library:** Stored locally in IndexedDB / Chrome Storage with thumbnail gallery, search by domain/tags, and filtering by type (Static / Motion / Video).
- **Export & Integrations (Future Phases):**
  - Copy directly to clipboard (image or video file).
  - Sync/Export to Notion Database, Figma clipboard, or download as organized folder structure.

---

### 5. UI Design & Animation System (Apple Design Standards)
Following the active `apple-design` skill guidelines:
- **Aesthetic:** Dark-mode first, minimal, refined visual language.
- **Surfaces & Depth:** Deep monochrome palette (`#0E1015`, `#161922`, `#1F232F`). Elevation is expressed through subtle background luminance steps and 1px borders (`rgba(255, 255, 255, 0.08)`), rather than heavy drop-shadows.
- **Accents:** Restrained Apple System Blue (`#0A84FF` / `#0071E3`) for active states, primary capture buttons, and folder selection rings.
- **Motion & Transitions:**
  - Micro-interactions (hover, active press, badge transitions): snappy **200ms**.
  - Component drawers, side panel reveals, modal sheets: **260ms – 300ms** using `cubic-bezier(0.25, 1, 0.5, 1)` ease-out curves.
  - Press interactions: subtle tactile scale-down (`transform: scale(0.97)`).
- **Glassmorphism:** Overlays and in-page capture toolbars use backdrop-filtered frosted glass (`backdrop-filter: blur(20px) saturate(180%)`).

---

### 6. Technical Architecture (Manifest V3)

```
┌────────────────────────────────────────────────────────┐
│                   Chrome Browser                       │
├────────────────────────────────────────────────────────┤
│  Content Script                                        │
│  - Element hovering & Marquee Selection UI             │
│  - DOM Inspection (Site Title, Meta, CSS Tokens)       │
│  - Floating Quick-Tag & Folder Confirmation Toast      │
├────────────────────────────────────────────────────────┤
│  Background Service Worker                             │
│  - Coordinates capture actions & shortcut listeners   │
│  - Calls chrome.tabs.captureVisibleTab (Screenshots)   │
│  - Requests chrome.tabCapture stream (Motion capture)  │
│  - Manages Folder Indexing & Chrome Storage / IDB      │
├────────────────────────────────────────────────────────┤
│  Offscreen Document (chrome.offscreen)                 │
│  - Receives tab media stream                           │
│  - Crops video stream to selection bounds via Canvas   │
│  - Runs MediaRecorder (WebM/MP4)                       │
├────────────────────────────────────────────────────────┤
│  Extension Side Panel / Dashboard (Apple Design Dark)  │
│  - Folder grouping by Domain / Site Title              │
│  - Visual gallery of saved inspirations                │
│  - Search, filter by tags/domain/media type            │
│  - Integrations (Notion, Figma, JSON/Zip export)       │
└────────────────────────────────────────────────────────┘
```

---

### 7. Product Roadmap & Phasing

| Phase | Milestone | Features |
|---|---|---|
| **Phase 1: MVP Core** | Static Area Capture, Metadata & Auto-Folders | • Area drag-and-drop crop screenshot<br>• Metadata collection (URL, title, timestamp, viewport)<br>• **Domain-based Auto-Folder creation (Site Title → URL fallback)**<br>• Local gallery & folder list in extension Side Panel (Apple Design Dark) |
| **Phase 2: Motion Capture** | Motion & Video Extractor | • Area-bounded tab recording (WebM/MP4)<br>• Direct HTML5 video link sniffer & download<br>• Recording duration presets (3s, 5s, 10s, manual) |
| **Phase 3: Design Intelligence** | Styling & Token Extraction | • Auto-extract CSS font styles and color palette<br>• Copy as CSS / Tailwind snippet |
| **Phase 4: Sync & Ecosystem** | Cloud & Tool Integrations | • Notion sync (via Notion API)<br>• Figma plugin / copy-as-frame<br>• Cloud backup & export |

---

### 8. Open Brainstorming Questions for Discussion
1. **Motion Output Format:** Should recorded animations be saved as lightweight WebM/MP4 video files, animated GIFs, or offer both? (WebM is tiny and 60fps; GIFs are widely portable).
2. **Library Surface Area:** Should the collection library live primarily inside the **Chrome Side Panel** (opens beside whatever you browse) or as a standalone **Full-page Web App Dashboard**?
3. **Storage Strategy:** Start purely offline/local-first (IndexedDB + local downloads) or connect to cloud storage from day one?
