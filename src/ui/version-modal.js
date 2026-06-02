// src/ui/version-modal.js — 版本信息模态框
function showVersionModal() {
  // 防止重复打开
  if (document.getElementById('version-modal')) return;

  var v = window.__VERSION__    || '?';
  var c = window.__COMMIT__     || '?';
  var b = window.__BRANCH__     || '?';
  var t = window.__BUILD_TIME__ || '?';

  // 格式化构建时间
  var buildStr = t;
  try {
    buildStr = new Date(t).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch(e) {}

  var overlay = document.createElement('div');
  overlay.id = 'version-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-content version-info-card">' +
    '<div class="version-title">DBG Card Game</div>' +
    '<div class="version-row"><span class="version-label">版本</span><span class="version-value">' + v + '</span></div>' +
    '<div class="version-row"><span class="version-label">Commit</span><span class="version-value">' + c + '</span></div>' +
    '<div class="version-row"><span class="version-label">分支</span><span class="version-value">' + b + '</span></div>' +
    '<div class="version-row"><span class="version-label">构建</span><span class="version-value">' + buildStr + '</span></div>' +
    '<div class="version-hint">按 ESC 或点击任意区域关闭</div>' +
  '</div>';

  document.body.appendChild(overlay);

  // 点击关闭
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeVersionModal();
  });

  // ESC 关闭
  var escHandler = function(e) {
    if (e.key === 'Escape') {
      closeVersionModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // 暴露关闭函数
  window.__hideVersionModal = closeVersionModal;
}

function closeVersionModal() {
  var modal = document.getElementById('version-modal');
  if (modal) modal.remove();
  window.__hideVersionModal = null;
}

// 注入全局快捷键回调（由 boot.js 调用）
window.__showVersionModal = showVersionModal;