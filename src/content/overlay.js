// Inspiration Curator — Content Script
// Resizable Viewfinder with Camera Shutter Dock & macOS Fly-to-Folder Animation

(function () {
  // Prevent duplicate execution
  if (window.__inspireCuratorInjected) return;
  window.__inspireCuratorInjected = true;

  let overlayRoot = null;
  let viewfinder = null;
  let dimensionPill = null;
  let isDragging = false;
  let isResizing = false;
  let resizeDirection = null;
  let startX = 0, startY = 0;
  let initialRect = { left: 0, top: 0, width: 0, height: 0 };

  // Helper: Extract site title with domain fallback
  function getSiteMetadata() {
    let siteTitle = document.title ? document.title.trim() : '';
    // Strip common notification/unread markers like "(3) Linear" -> "Linear"
    siteTitle = siteTitle.replace(/^\(\d+\)\s*/, '');
    
    // Check OpenGraph site name fallback
    const ogSite = document.querySelector('meta[property="og:site_name"]');
    if (ogSite && ogSite.content && ogSite.content.trim()) {
      siteTitle = ogSite.content.trim();
    }

    const host = window.location.hostname.replace(/^www\./, '');
    // If title is empty or uninformative, fall back to hostname
    const folderName = siteTitle || host;

    return {
      folderName,
      siteTitle: siteTitle || host,
      host,
      url: window.location.href,
      favicon: getFaviconUrl()
    };
  }

  function getFaviconUrl() {
    const link = document.querySelector('link[rel~="icon"]');
    return link ? link.href : `${window.location.origin}/favicon.ico`;
  }

  // Realistic macOS Monterey/Ventura/Sonoma Aqua Folder SVG
  function getMacOSFolderSVG(width = 24, height = 20) {
    return `
      <svg class="macos-folder-icon" width="${width}" height="${height}" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="macFolderGrad" x1="16" y1="0" x2="16" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#4AB3FF"/>
            <stop offset="100%" stop-color="#0066CC"/>
          </linearGradient>
          <linearGradient id="macTabGrad" x1="16" y1="0" x2="16" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#3FA6F5"/>
            <stop offset="100%" stop-color="#1E7FD4"/>
          </linearGradient>
        </defs>
        <!-- Tab Back -->
        <path d="M2 4C2 2.89543 2.89543 2 4 2H11C12.3 2 13.5 2.8 14.2 3.8L15.6 5.6C16.1 6.2 16.8 6.6 17.6 6.6H28C29.1046 6.6 30 7.49543 30 8.6V12H2V4Z" fill="url(#macTabGrad)"/>
        <!-- Main Folder Body with Rounded Corners & Sheen -->
        <rect x="1" y="7" width="30" height="18" rx="3.5" fill="url(#macFolderGrad)"/>
        <!-- Subtle Folder Interior Emboss / Bottom Lip -->
        <rect x="2" y="8" width="28" height="1" fill="rgba(255, 255, 255, 0.45)"/>
        <rect x="1" y="24" width="30" height="1" fill="rgba(0, 50, 120, 0.35)"/>
      </svg>
    `;
  }

  // Toggle or open overlay
  function toggleOverlay() {
    if (overlayRoot) {
      removeOverlay();
    } else {
      createOverlay();
    }
  }

  function createOverlay() {
    const meta = getSiteMetadata();

    // Default centered 480x360 box (clamped to screen size)
    const boxWidth = Math.min(480, window.innerWidth - 60);
    const boxHeight = Math.min(360, window.innerHeight - 100);
    const boxLeft = Math.max(20, (window.innerWidth - boxWidth) / 2);
    const boxTop = Math.max(40, (window.innerHeight - boxHeight) / 2);

    // Use native <dialog> opened with showModal()
    // When a page has an open modal dialog (like <dialog> or <cari-modal>), the browser makes ALL non-modal
    // elements and popovers inert! Calling showModal() on our extension dialog places us at the very top of
    // the Top Layer and guarantees our crosshairs, drag handles, and buttons remain fully interactive.
    overlayRoot = document.createElement('dialog');
    overlayRoot.id = 'inspire-overlay-root';

    overlayRoot.innerHTML = `
      <div class="inspire-backdrop visible"></div>
      <div class="inspire-viewfinder" style="left: ${boxLeft}px; top: ${boxTop}px; width: ${boxWidth}px; height: ${boxHeight}px;">
        <div class="inspire-dimension-pill">${Math.round(boxWidth)} × ${Math.round(boxHeight)} px</div>
        
        <!-- 8 Handles -->
        <div class="inspire-handle nw" data-dir="nw"></div>
        <div class="inspire-handle n" data-dir="n"></div>
        <div class="inspire-handle ne" data-dir="ne"></div>
        <div class="inspire-handle e" data-dir="e"></div>
        <div class="inspire-handle se" data-dir="se"></div>
        <div class="inspire-handle s" data-dir="s"></div>
        <div class="inspire-handle sw" data-dir="sw"></div>
        <div class="inspire-handle w" data-dir="w"></div>

        <!-- Camera Shutter Dock -->
        <div class="inspire-dock">
          <div class="inspire-dock-folder" title="Saving to domain folder: ${meta.folderName}">
            ${getMacOSFolderSVG(22, 18)}
            <span>${escapeHtml(meta.folderName)}</span>
          </div>
          <button class="inspire-shutter-btn" id="inspireShutterBtn" title="Take Snap (Capture to Folder)">
            <div class="inspire-shutter-inner"></div>
          </button>
          <button class="inspire-dock-close" id="inspireCloseBtn" title="Close (Esc)">✕</button>
        </div>
      </div>
      <div class="inspire-flash"></div>
    `;

    (document.documentElement || document.body).appendChild(overlayRoot);

    if (typeof overlayRoot.showModal === 'function') {
      try {
        overlayRoot.showModal();
      } catch (e) {
        overlayRoot.show();
      }
    }

    viewfinder = overlayRoot.querySelector('.inspire-viewfinder');
    dimensionPill = overlayRoot.querySelector('.inspire-dimension-pill');

    // Attach Event Listeners
    setupInteraction();

    // Shutter Click
    const shutterBtn = overlayRoot.querySelector('#inspireShutterBtn');
    shutterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      captureAndAnimate();
    });

    // Close button
    const closeBtn = overlayRoot.querySelector('#inspireCloseBtn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeOverlay();
    });

    // Backdrop click or Esc key
    overlayRoot.querySelector('.inspire-backdrop').addEventListener('click', removeOverlay);
    window.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      removeOverlay();
    }
  }

  function removeOverlay() {
    window.removeEventListener('keydown', handleKeydown);
    if (overlayRoot && overlayRoot.parentNode) {
      overlayRoot.parentNode.removeChild(overlayRoot);
    }
    overlayRoot = null;
    viewfinder = null;
  }

  function updateDimensionPill(w, h) {
    if (dimensionPill) {
      dimensionPill.textContent = `${Math.round(w)} × ${Math.round(h)} px`;
    }
  }

  // Dragging and Resizing Logic
  function setupInteraction() {
    // Start Dragging
    const onStartDrag = (e) => {
      if (e.target.classList.contains('inspire-handle') || e.target.closest('.inspire-dock')) {
        return; // Don't drag when touching handles or dock controls
      }
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = viewfinder.getBoundingClientRect();
      initialRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      e.preventDefault();
      e.stopPropagation();
    };

    viewfinder.addEventListener('mousedown', onStartDrag);
    viewfinder.addEventListener('pointerdown', onStartDrag);

    // Start Resizing from Handles
    const handles = viewfinder.querySelectorAll('.inspire-handle');
    handles.forEach(h => {
      const onStartResize = (e) => {
        isResizing = true;
        resizeDirection = h.getAttribute('data-dir');
        startX = e.clientX;
        startY = e.clientY;
        const rect = viewfinder.getBoundingClientRect();
        initialRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        e.preventDefault();
        e.stopPropagation();
      };
      h.addEventListener('mousedown', onStartResize);
      h.addEventListener('pointerdown', onStartResize);
    });

    // Move Handler
    const onMove = (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(0, Math.min(window.innerWidth - initialRect.width, initialRect.left + dx));
        const newTop = Math.max(0, Math.min(window.innerHeight - initialRect.height, initialRect.top + dy));
        viewfinder.style.left = `${newLeft}px`;
        viewfinder.style.top = `${newTop}px`;
        e.preventDefault();
      } else if (isResizing) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let { left, top, width, height } = initialRect;
        const minW = 120, minH = 80;

        if (resizeDirection.includes('e')) width = Math.max(minW, initialRect.width + dx);
        if (resizeDirection.includes('s')) height = Math.max(minH, initialRect.height + dy);
        if (resizeDirection.includes('w')) {
          const proposedW = initialRect.width - dx;
          if (proposedW >= minW) {
            left = initialRect.left + dx;
            width = proposedW;
          }
        }
        if (resizeDirection.includes('n')) {
          const proposedH = initialRect.height - dy;
          if (proposedH >= minH) {
            top = initialRect.top + dy;
            height = proposedH;
          }
        }

        viewfinder.style.left = `${left}px`;
        viewfinder.style.top = `${top}px`;
        viewfinder.style.width = `${width}px`;
        viewfinder.style.height = `${height}px`;
        updateDimensionPill(width, height);
        e.preventDefault();
      }
    };

    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: false });

    // End Drag / Resize
    const onEnd = () => {
      isDragging = false;
      isResizing = false;
      resizeDirection = null;
    };

    window.addEventListener('mouseup', onEnd);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  // Core Capture Flow & macOS Fly-to-Folder Animation
  async function captureAndAnimate() {
    if (!viewfinder) return;

    // 1. Get exact crop coordinates relative to viewport
    const rect = viewfinder.getBoundingClientRect();
    const cropBounds = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      dpr: window.devicePixelRatio || 1
    };

    // Temporarily hide overlay UI elements so they don't get captured in the screenshot
    overlayRoot.style.visibility = 'hidden';

    // 2. Trigger Visible Tab Capture via background service worker
    chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB' }, async (response) => {
      overlayRoot.style.visibility = 'visible';

      if (!response || !response.success || !response.dataUrl) {
        console.error('Failed to capture tab screenshot:', response?.error);
        alert('Could not capture screen. Please check page permissions.');
        return;
      }

      // 3. Crop screenshot using high-DPI canvas
      const croppedDataUrl = await cropImage(response.dataUrl, cropBounds);

      // 4. Camera Flash effect
      const flash = overlayRoot.querySelector('.inspire-flash');
      if (flash) {
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 100);
      }

      // 5. Hide the viewfinder box during the flying animation
      viewfinder.style.opacity = '0';

      // 6. Spawn macOS Destination Toast & Fly Thumbnail
      const meta = getSiteMetadata();
      await runFlyToFolderAnimation(croppedDataUrl, rect, meta);

      // 7. Save item to storage under domain folder
      const inspirationItem = {
        id: 'insp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        folder: meta.folderName,
        siteTitle: meta.siteTitle,
        domain: meta.host,
        url: meta.url,
        favicon: meta.favicon,
        timestamp: Date.now(),
        image: croppedDataUrl,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };

      chrome.runtime.sendMessage({ action: 'SAVE_INSPIRATION', payload: inspirationItem });

      // Clean up overlay after animation finishes
      setTimeout(() => {
        removeOverlay();
      }, 700);
    });
  }

  // Crop image with devicePixelRatio support for Retina displays
  function cropImage(dataUrl, bounds) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const dpr = bounds.dpr;

        // Physical pixel coordinates on Retina
        const sx = bounds.x * dpr;
        const sy = bounds.y * dpr;
        const sw = bounds.width * dpr;
        const sh = bounds.height * dpr;

        canvas.width = sw;
        canvas.height = sh;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  // The macOS Fly-to-Folder animation sequence
  function runFlyToFolderAnimation(croppedDataUrl, sourceRect, meta) {
    return new Promise((resolve) => {
      // 1. Create flying thumbnail image clone
      const flyingImg = document.createElement('img');
      flyingImg.src = croppedDataUrl;
      flyingImg.className = 'inspire-flying-crop';
      if (typeof flyingImg.showPopover === 'function') {
        flyingImg.setAttribute('popover', 'manual');
      }
      flyingImg.style.left = `${sourceRect.left}px`;
      flyingImg.style.top = `${sourceRect.top}px`;
      flyingImg.style.width = `${sourceRect.width}px`;
      flyingImg.style.height = `${sourceRect.height}px`;
      (document.documentElement || document.body).appendChild(flyingImg);
      if (typeof flyingImg.showPopover === 'function') {
        try { flyingImg.showPopover(); } catch(e) {}
      }

      // 2. Create Destination Folder Toast at Bottom-Right
      const toast = document.createElement('div');
      toast.className = 'inspire-macos-folder-toast';
      if (typeof toast.showPopover === 'function') {
        toast.setAttribute('popover', 'manual');
      }
      toast.innerHTML = `
        <div class="inspire-toast-folder-icon">
          ${getMacOSFolderSVG(36, 30)}
        </div>
        <div class="inspire-toast-content">
          <div class="inspire-toast-title">Added to ${escapeHtml(meta.folderName)}</div>
          <div class="inspire-toast-subtitle">${escapeHtml(meta.host)}</div>
        </div>
        <button class="inspire-toast-btn" id="openSidePanelBtn">Open Library</button>
      `;
      (document.documentElement || document.body).appendChild(toast);
      if (typeof toast.showPopover === 'function') {
        try { toast.showPopover(); } catch(e) {}
      }

      // Open sidepanel button handler
      toast.querySelector('#openSidePanelBtn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' });
      });

      // Animate toast entry
      requestAnimationFrame(() => {
        toast.classList.add('visible');
        const toastRect = toast.getBoundingClientRect();

        // Target coordinates = folder icon center inside bottom-right toast
        const targetX = toastRect.left + 24;
        const targetY = toastRect.top + 20;

        // Fly thumbnail into target folder
        setTimeout(() => {
          flyingImg.style.left = `${targetX - 20}px`;
          flyingImg.style.top = `${targetY - 15}px`;
          flyingImg.style.width = '40px';
          flyingImg.style.height = '30px';
          flyingImg.style.opacity = '0';
          flyingImg.style.transform = 'scale(0.15) rotate(8deg)';

          // Folder Pop bounce effect when thumbnail enters
          setTimeout(() => {
            const folderIcon = toast.querySelector('.inspire-toast-folder-icon');
            if (folderIcon) folderIcon.classList.add('pop');
            setTimeout(() => {
              if (folderIcon) folderIcon.classList.remove('pop');
              if (flyingImg.parentNode) flyingImg.parentNode.removeChild(flyingImg);
            }, 200);

            // Auto-hide toast after 3.2 seconds
            setTimeout(() => {
              toast.classList.remove('visible');
              setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
              }, 300);
            }, 3200);

            resolve();
          }, 380);
        }, 50);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Listen to messages from background worker
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'TOGGLE_OVERLAY') {
      toggleOverlay();
      sendResponse({ status: 'ok' });
    }
  });

  // Expose for demo-test.html and direct script trigger
  window.__inspireToggleOverlay = toggleOverlay;
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'DEMO_TRIGGER') {
      toggleOverlay();
    }
  });

})();
