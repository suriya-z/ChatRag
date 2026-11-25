// Console shell: sidebar, deck header, diff, raw drawer, logs, command palette.
// Config load/save and all tab features live in legacy-app.js (window.configManager).

let originalConfig = {};
let commandPaletteIndex = 0;
let filteredCommands = [];
let cursorDistort = 0.5;

function logEvent(type, msg) {
  const container = document.getElementById('log-stream');
  if (!container) return;
  const now = new Date().toTimeString().split(' ')[0];
  const div = document.createElement('div');
  div.className = 'log-line';
  const ts = document.createElement('span');
  ts.className = 'log-ts';
  ts.textContent = `[${now}]`;
  const text = document.createElement('span');
  text.className = `log-${type}`;
  text.textContent = msg;
  div.append(ts, ' ', text);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

const TOAST_COLORS = {
  info: 'var(--accent-cyan)',
  success: 'var(--accent-green)',
  warning: 'var(--accent-amber)',
  error: 'var(--accent-rose)',
};

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.borderColor = TOAST_COLORS[type] || TOAST_COLORS.info;
  toast.style.display = 'flex';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3200);
  logEvent(type === 'error' ? 'warn' : type === 'success' ? 'ok' : 'info', message);
}
window.showToast = showToast;

function initPulsarCanvas() {
  const canvas = document.getElementById('pulsar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = canvas.offsetWidth;
  let height = canvas.height = canvas.offsetHeight;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursorDistort = (e.clientX - rect.left) / rect.width;
  });

  const linesCount = 20;
  let t = 0;
  function render() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1;
    if (!prefersReduced) t += 0.02;
    for (let i = 0; i < linesCount; i++) {
      const yBase = (height / (linesCount + 1)) * (i + 1);
      ctx.beginPath();
      ctx.strokeStyle = i === 10 ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)';
      for (let x = 0; x < width; x += 3) {
        const normX = x / width;
        const envelope = Math.max(0, 1 - Math.abs(normX - cursorDistort) * 3.5);
        const wave = Math.sin(x * 0.03 + t + i * 0.4) * Math.cos(x * 0.015 - t);
        const yOffset = wave * envelope * 24;
        if (x === 0) ctx.moveTo(x, yBase - yOffset);
        else ctx.lineTo(x, yBase - yOffset);
      }
      ctx.stroke();
    }
    if (!prefersReduced) requestAnimationFrame(render);
  }
  render();
}

function getConfig() {
  return (window.configManager && window.configManager.config) || {};
}

function activateTab(tabId) {
  const item = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
  if (item) item.click();
}

function syncDeckTitle(tabId) {
  const item = document.querySelector(`.menu-item[data-tab="${tabId}"] .item-title`);
  if (item) document.getElementById('deck-serial-title').textContent = item.textContent;
}

function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function togglePasswordVisibility(fieldId, btn) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  btn.textContent = reveal ? 'Hide' : 'Show';
}

function copyVarName(varName, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  navigator.clipboard.writeText(varName).then(() => showToast(`Copied: ${varName}`));
}

function getActiveDiffs() {
  const current = getConfig();
  const diffs = [];
  for (const [k, v] of Object.entries(current)) {
    const orig = originalConfig[k];
    if (String(orig ?? '') !== String(v ?? '')) diffs.push({ key: k, oldVal: orig, newVal: v });
  }
  return diffs;
}

function updateDiffState() {
  const diffs = getActiveDiffs();
  const diffBtn = document.getElementById('btn-diff-view');
  const statusEl = document.getElementById('save-status');
  if (diffs.length > 0) {
    diffBtn.style.display = 'inline-flex';
    diffBtn.textContent = `Diff (${diffs.length})`;
    statusEl.textContent = `● ${diffs.length} unsaved changes`;
    statusEl.style.color = 'var(--accent-amber)';
  } else {
    diffBtn.style.display = 'none';
    statusEl.textContent = `Synced (${Object.keys(getConfig()).length} variables)`;
    statusEl.style.color = 'var(--accent-green)';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showDiffModal() {
  const diffs = getActiveDiffs();
  const body = document.getElementById('diff-body');
  if (diffs.length === 0) {
    body.innerHTML = '<div class="diff-empty">No active changes compared to .env.local</div>';
  } else {
    body.innerHTML = diffs.map((d) => `
      <div style="margin-bottom: 12px;">
        <div style="color: var(--accent-cyan); font-weight: 600; margin-bottom: 4px; font-variant-numeric: tabular-nums;">${escapeHtml(d.key)}</div>
        <div class="diff-line diff-del">- ${escapeHtml(d.oldVal) || '(empty)'}</div>
        <div class="diff-line diff-add">+ ${escapeHtml(d.newVal) || '(empty)'}</div>
      </div>
    `).join('');
  }
  document.getElementById('diff-modal').style.display = 'flex';
}

function closeDiffModal() {
  document.getElementById('diff-modal').style.display = 'none';
}

function refreshRawEditor() {
  document.getElementById('raw-editor').value = Object.entries(getConfig())
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function saveConfig() {
  if (window.configManager) window.configManager.saveConfig();
}

async function reloadEnv() {
  try {
    showToast('Reloading server environment...');
    const res = await fetch('/api/config/reload', { method: 'POST' });
    showToast(res.ok ? 'Server reloaded successfully' : 'Server reload signal sent', res.ok ? 'success' : 'info');
  } catch (err) {
    showToast(`Reload error: ${err.message}`, 'error');
  }
}

function toggleRawDrawer() {
  const d = document.getElementById('raw-drawer');
  refreshRawEditor();
  d.style.display = d.style.display === 'flex' ? 'none' : 'flex';
  document.getElementById('terminal-drawer').style.display = 'none';
}

function toggleTerminalDrawer() {
  const d = document.getElementById('terminal-drawer');
  d.style.display = d.style.display === 'flex' ? 'none' : 'flex';
  document.getElementById('raw-drawer').style.display = 'none';
}

const ACTION_COMMANDS = [
  { action: 'save', title: 'Save All to .env.local (Ctrl+S)', category: 'Actions' },
  { action: 'reload', title: 'Reload Server Process', category: 'Actions' },
  { action: 'diff', title: 'View Active Diff Matrix', category: 'Actions' },
  { action: 'terminal', title: 'Toggle Live Console Logs', category: 'Actions' },
];

function getAllCommands() {
  const tabs = Array.from(document.querySelectorAll('.catalog-item.menu-item')).map((el) => ({
    id: el.getAttribute('data-tab'),
    title: el.querySelector('.item-title').textContent,
    category: el.getAttribute('data-parent-cat'),
  }));
  return tabs.concat(ACTION_COMMANDS);
}

function openCommandPalette() {
  document.getElementById('cmd-palette').style.display = 'flex';
  const inp = document.getElementById('cmd-input');
  inp.value = '';
  inp.focus();
  renderCommands('');
}

function closeCommandPalette() {
  document.getElementById('cmd-palette').style.display = 'none';
}

function renderCommands(q) {
  const term = q.toLowerCase();
  filteredCommands = getAllCommands().filter((c) =>
    c.title.toLowerCase().includes(term) || c.category.toLowerCase().includes(term)
  );
  commandPaletteIndex = 0;
  const listEl = document.getElementById('cmd-results');
  if (filteredCommands.length === 0) {
    listEl.innerHTML = '<div class="diff-empty">No matching commands or settings</div>';
    return;
  }
  listEl.innerHTML = filteredCommands.map((c, idx) => `
    <div class="cmd-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}" onclick="execCommand(${idx})">
      <span class="cmd-item-title">${escapeHtml(c.title)}</span>
      <span class="cmd-item-category">${escapeHtml(c.category)}</span>
    </div>
  `).join('');
}

function execCommand(idx) {
  const cmd = filteredCommands[idx];
  if (!cmd) return;
  closeCommandPalette();
  if (cmd.action === 'save') saveConfig();
  else if (cmd.action === 'reload') reloadEnv();
  else if (cmd.action === 'diff') showDiffModal();
  else if (cmd.action === 'terminal') toggleTerminalDrawer();
  else if (cmd.id) activateTab(cmd.id);
}

function updateCmdSelection() {
  document.querySelectorAll('.cmd-item').forEach((el, idx) => {
    el.classList.toggle('selected', idx === commandPaletteIndex);
    if (idx === commandPaletteIndex) el.scrollIntoView({ block: 'nearest' });
  });
}

function navigateTabs(delta) {
  const items = Array.from(document.querySelectorAll('.catalog-item.menu-item')).filter((el) => el.style.display !== 'none');
  if (items.length === 0) return;
  const currentIdx = items.findIndex((el) => el.classList.contains('active'));
  const nextIdx = (currentIdx + delta + items.length) % items.length;
  activateTab(items[nextIdx].getAttribute('data-tab'));
}

function filterCatalog(q) {
  const term = q.toLowerCase();
  const items = Array.from(document.querySelectorAll('.catalog-item'));
  items.forEach((el) => {
    const title = el.querySelector('.item-title').textContent.toLowerCase();
    el.style.display = title.includes(term) ? 'flex' : 'none';
  });
  document.querySelectorAll('.category-header').forEach((catHeader) => {
    const catName = catHeader.getAttribute('data-category');
    const visible = items.some((it) => it.getAttribute('data-parent-cat') === catName && it.style.display !== 'none');
    catHeader.style.display = visible || term.length === 0 ? 'block' : 'none';
  });
}

window.addEventListener('keydown', (e) => {
  const tag = document.activeElement.tagName;
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement.isContentEditable;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openCommandPalette();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveConfig();
    return;
  }
  if (e.key === 'Escape') {
    closeCommandPalette();
    closeDiffModal();
    document.getElementById('raw-drawer').style.display = 'none';
    document.getElementById('terminal-drawer').style.display = 'none';
    return;
  }
  if (document.getElementById('cmd-palette').style.display === 'flex') {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      commandPaletteIndex = Math.min(filteredCommands.length - 1, commandPaletteIndex + 1);
      updateCmdSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      commandPaletteIndex = Math.max(0, commandPaletteIndex - 1);
      updateCmdSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execCommand(commandPaletteIndex);
    }
    return;
  }
  if (!isInput) {
    if (e.key === 'j') navigateTabs(1);
    else if (e.key === 'k') navigateTabs(-1);
    else if (e.key === '/') { e.preventDefault(); openCommandPalette(); }
  }
});

// Bridge legacy ConfigManager into the shell's diff and status display.
function hookConfigManager() {
  // ConfigManager is a top-level class in legacy-app.js (global lexical scope, not a window property).
  if (typeof ConfigManager === 'undefined') return;
  const target = ConfigManager.prototype;
  if (target.__shellHooked) return;
  target.__shellHooked = true;

  const origLoad = target.loadConfig;
  target.loadConfig = async function (...args) {
    const result = await origLoad.apply(this, args);
    originalConfig = { ...this.config };
    updateDiffState();
    logEvent('ok', `Synced ${Object.keys(this.config).length} variables from .env.local`);
    return result;
  };

  const origUpdate = target.updateConfig;
  target.updateConfig = function (...args) {
    const result = origUpdate.apply(this, args);
    updateDiffState();
    return result;
  };

  const origSave = target.saveConfig;
  target.saveConfig = async function (...args) {
    const result = await origSave.apply(this, args);
    if (!this.hasChanges) originalConfig = { ...this.config };
    updateDiffState();
    return result;
  };
}

// Patch before legacy-app.js's DOMContentLoaded handler instantiates the manager.
hookConfigManager();

document.addEventListener('click', (e) => {
  const item = e.target.closest('.catalog-item.menu-item');
  if (!item) return;
  syncDeckTitle(item.getAttribute('data-tab'));
  if (window.innerWidth <= 840) document.getElementById('sidebar').classList.remove('open');
});

window.addEventListener('hashchange', () => {
  const tabId = window.location.hash.slice(1);
  if (tabId) syncDeckTitle(tabId);
});

document.addEventListener('DOMContentLoaded', () => {
  initPulsarCanvas();
  const hash = window.location.hash.replace('#', '');
  const startTab = hash && document.getElementById(hash) ? hash : 'deployment';
  if (!document.querySelector('.tab-content.active')) activateTab(startTab);
  syncDeckTitle(startTab);
});
