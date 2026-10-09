// Side Panel JavaScript — Inspiration Curator
// Reads saved inspirations from chrome.storage.local and groups into macOS-style domain folders

let allInspirations = [];
let activeItem = null;

document.addEventListener('DOMContentLoaded', () => {
  loadInspirations();

  document.getElementById('refreshBtn').addEventListener('click', loadInspirations);
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterInspirations(e.target.value.toLowerCase().trim());
  });

  // Modal interactions
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  document.getElementById('modalDeleteBtn').addEventListener('click', deleteActiveItem);

  // Auto-reload when storage updates
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.inspirations) {
      loadInspirations();
    }
  });
});

async function loadInspirations() {
  const data = await chrome.storage.local.get(['inspirations']);
  allInspirations = data.inspirations || [];
  renderFolders(allInspirations);
}

function renderFolders(items) {
  const container = document.getElementById('foldersContainer');
  const emptyState = document.getElementById('emptyState');
  const totalCount = document.getElementById('totalCount');

  totalCount.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;

  if (!items.length) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = '';

  // Group items by folder name (Site Title -> domain fallback)
  const groups = {};
  items.forEach(item => {
    const fName = item.folder || item.domain || 'Uncategorized';
    if (!groups[fName]) groups[fName] = [];
    groups[fName].push(item);
  });

  // Render each folder group
  Object.keys(groups).forEach(folderName => {
    const folderItems = groups[folderName];
    const groupEl = document.createElement('div');
    groupEl.className = 'folder-group';

    groupEl.innerHTML = `
      <div class="folder-header">
        <div class="folder-title-left">
          <svg class="macos-folder-svg" width="22" height="18" viewBox="0 0 32 26" fill="none">
            <path d="M2 4C2 2.89543 2.89543 2 4 2H11C12.3 2 13.5 2.8 14.2 3.8L15.6 5.6C16.1 6.2 16.8 6.6 17.6 6.6H28C29.1046 6.6 30 7.49543 30 8.6V12H2V4Z" fill="#3FA6F5"/>
            <rect x="1" y="7" width="30" height="18" rx="3.5" fill="#0071E3"/>
          </svg>
          <span class="folder-name">${escapeHtml(folderName)}</span>
        </div>
        <span class="folder-count">${folderItems.length}</span>
      </div>
      <div class="folder-items-grid"></div>
    `;

    const grid = groupEl.querySelector('.folder-items-grid');
    folderItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-thumb-wrap">
          <img src="${item.image}" alt="Inspiration Snap" loading="lazy">
        </div>
        <div class="item-meta">
          <span>${formatDate(item.timestamp)}</span>
          <span class="item-dim">${item.width}×${item.height}</span>
        </div>
      `;
      card.addEventListener('click', () => openModal(item));
      grid.appendChild(card);
    });

    // Toggle collapse on folder header click
    const header = groupEl.querySelector('.folder-header');
    header.addEventListener('click', () => {
      grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
    });

    container.appendChild(groupEl);
  });
}

function filterInspirations(query) {
  if (!query) {
    renderFolders(allInspirations);
    return;
  }
  const filtered = allInspirations.filter(i => 
    (i.folder && i.folder.toLowerCase().includes(query)) ||
    (i.domain && i.domain.toLowerCase().includes(query)) ||
    (i.siteTitle && i.siteTitle.toLowerCase().includes(query))
  );
  renderFolders(filtered);
}

function openModal(item) {
  activeItem = item;
  document.getElementById('modalFolderPill').textContent = item.folder || item.domain;
  document.getElementById('modalSite').textContent = item.domain || '';
  document.getElementById('modalImg').src = item.image;
  const visitLink = document.getElementById('modalVisitLink');
  visitLink.href = item.url || '#';
  visitLink.style.display = item.url ? 'inline-block' : 'none';
  document.getElementById('modalBackdrop').classList.add('open');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  activeItem = null;
}

async function deleteActiveItem() {
  if (!activeItem) return;
  allInspirations = allInspirations.filter(i => i.id !== activeItem.id);
  await chrome.storage.local.set({ inspirations: allInspirations });
  await chrome.action.setBadgeText({ text: allInspirations.length ? String(allInspirations.length) : '' });
  closeModal();
  renderFolders(allInspirations);
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
