// market-loader.js - V61 卡包市场 - 远程URL加载卡包
// 负责从远程URL加载、安装、卸载卡包

(function() {
  'use strict';

  const RemoteCardPackLoader = {
    STORAGE_KEY: 'installedRemotePacks',
    FETCH_TIMEOUT: 10000, // 10秒超时

    // 从localStorage获取已安装的远程卡包列表
    getInstalledList() {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.warn('Failed to load installed remote packs:', e);
        return [];
      }
    },

    // 保存已安装的远程卡包列表到localStorage
    saveInstalledList(list) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to save installed remote packs:', e);
      }
    },

    // 从URL加载卡包数据
    async loadFromUrl(url) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return this.validateAndNormalize(data, url);
      } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          throw new Error('加载超时，请检查网络连接');
        }
        throw new Error(`加载失败: ${e.message}`);
      }
    },

    // 验证并规范化卡包数据
    validateAndNormalize(data, url) {
      if (!data || typeof data !== 'object') {
        throw new Error('无效的卡包数据格式');
      }

      if (!data.id || !data.name) {
        throw new Error('卡包缺少必要字段(id/name)');
      }

      // 标记为远程卡包并记录来源URL
      return {
        id: String(data.id),
        name: String(data.name),
        description: data.description ? String(data.description) : '',
        version: data.version ? String(data.version) : '1.0.0',
        author: data.author ? String(data.author) : '未知作者',
        portrait: data.portrait || '🌐',
        cards: Array.isArray(data.cards) ? data.cards : [],
        relics: Array.isArray(data.relics) ? data.relics : [],
        enemies: Array.isArray(data.enemies) ? data.enemies : [],
        events: Array.isArray(data.events) ? data.events : [],
        sourceUrl: url,
        isRemote: true
      };
    },

    // 安装卡包
    async install(url) {
      // 检查是否已安装
      const installed = this.getInstalledList();
      const existing = installed.find(p => p.url === url);
      if (existing) {
        throw new Error('该卡包已安装');
      }

      // 加载并验证卡包
      const packData = await this.loadFromUrl(url);

      // 检查是否与本地注册的卡包ID冲突
      const allPacks = CardPackRegistry.getAllPacks();
      if (allPacks.some(p => p.id === packData.id)) {
        throw new Error(`卡包ID "${packData.id}" 已存在，请选择其他卡包`);
      }

      // 注册到CardPackRegistry
      CardPackRegistry.register(packData);
      CardPackRegistry.activate(packData.id);

      // 保存到localStorage
      installed.push({ id: packData.id, url: url, name: packData.name, version: packData.version });
      this.saveInstalledList(installed);

      // 刷新卡牌数据
      refreshAllFromRegistry();

      console.log(`Remote pack installed: ${packData.id} from ${url}`);
      return packData;
    },

    // 卸载卡包
    uninstall(packId) {
      const installed = this.getInstalledList();
      const index = installed.findIndex(p => p.id === packId);

      if (index === -1) {
        throw new Error('未找到该卡包');
      }

      const packInfo = installed[index];

      // 从CardPackRegistry移除
      CardPackRegistry.unregister(packId);

      // 从localStorage移除
      installed.splice(index, 1);
      this.saveInstalledList(installed);

      // 刷新卡牌数据
      refreshAllFromRegistry();

      console.log(`Remote pack uninstalled: ${packId}`);
      return packInfo;
    },

    // 重新加载所有已安装的远程卡包（页面初始化时调用）
    async reloadInstalled() {
      const installed = this.getInstalledList();
      const results = { success: [], failed: [] };

      for (const packInfo of installed) {
        try {
          const packData = await this.loadFromUrl(packInfo.url);
          // 验证ID一致
          if (packData.id !== packInfo.id) {
            throw new Error(`卡包ID不匹配: 期望 ${packInfo.id}，实际 ${packData.id}`);
          }
          CardPackRegistry.register(packData);
          CardPackRegistry.activate(packData.id);
          results.success.push(packInfo);
        } catch (e) {
          console.warn(`Failed to reload remote pack ${packInfo.id}:`, e);
          results.failed.push({ ...packInfo, error: e.message });
        }
      }

      if (results.failed.length > 0) {
        console.warn(`Failed to load ${results.failed.length} remote packs`);
      }

      return results;
    },

    // 获取远程卡包列表（用于UI显示）
    getRemotePacksInfo() {
      const installed = this.getInstalledList();
      const packs = CardPackRegistry.getAllPacks();
      const remotePacks = packs.filter(p => p.isRemote);

      return remotePacks.map(pack => {
        const info = installed.find(i => i.id === pack.id) || {};
        return {
          id: pack.id,
          name: pack.name,
          version: pack.version,
          description: pack.description,
          author: pack.author,
          sourceUrl: pack.sourceUrl,
          isActive: CardPackRegistry.isActive(pack.id)
        };
      });
    }
  };

  // 导出到window
  window.RemoteCardPackLoader = RemoteCardPackLoader;

  // 扩展卡包管理模态框，添加远程加载UI
  const originalOpenCardPackManager = window.openCardPackManager;
  window.openCardPackManager = function() {
    // 调用原始函数创建基础模态框
    originalOpenCardPackManager();

    // 等待模态框渲染完成后，添加远程加载区域
    setTimeout(() => {
      const container = document.getElementById('card-pack-manager-container');
      if (!container) return;

      const panel = container.querySelector('div[style*="border: 2px solid #ffd700"]');
      if (!panel) return;

      // 构建远程加载区域HTML
      const remoteSection = document.createElement('div');
      remoteSection.id = 'remote-pack-section';
      remoteSection.style.cssText = `
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px dashed #444;
      `;
      remoteSection.innerHTML = `
        <h3 style="color: #4ecdc4; margin-bottom: 10px; font-size: 14px;">🌐 远程卡包市场</h3>
        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <input type="text" id="remote-pack-url" placeholder="输入卡包JSON URL..." style="
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #444;
            border-radius: 8px;
            background: #2a2a3e;
            color: #fff;
            font-size: 13px;
          ">
          <button id="install-remote-pack-btn" style="
            padding: 10px 16px;
            background: linear-gradient(145deg, #4ecdc4, #2ecc71);
            border: none;
            border-radius: 8px;
            color: #000;
            font-weight: bold;
            cursor: pointer;
            font-size: 13px;
          ">安装</button>
        </div>
        <div id="remote-pack-status" style="font-size: 12px; margin-bottom: 10px; min-height: 20px;"></div>
        <div id="remote-pack-list" style="max-height: 200px; overflow-y: auto;">
        </div>
      `;

      // 插入到关闭按钮之前
      const closeBtn = panel.querySelector('button[onclick="closeCardPackManager()"]');
      if (closeBtn) {
        closeBtn.style.marginTop = '15px';
        panel.insertBefore(remoteSection, closeBtn);
      } else {
        panel.appendChild(remoteSection);
      }

      // 绑定安装按钮事件
      document.getElementById('install-remote-pack-btn').onclick = async function() {
        const urlInput = document.getElementById('remote-pack-url');
        const statusDiv = document.getElementById('remote-pack-status');
        const url = urlInput.value.trim();

        if (!url) {
          statusDiv.innerHTML = '<span style="color: #e74c3c;">请输入卡包URL</span>';
          return;
        }

        // 简单URL验证
        try {
          new URL(url);
        } catch (e) {
          statusDiv.innerHTML = '<span style="color: #e74c3c;">无效的URL格式</span>';
          return;
        }

        const btn = this;
        btn.disabled = true;
        btn.textContent = '安装中...';
        statusDiv.innerHTML = '<span style="color: #4ecdc4;">正在加载卡包...</span>';

        try {
          await RemoteCardPackLoader.install(url);
          statusDiv.innerHTML = '<span style="color: #2ecc71;">✓ 安装成功！</span>';
          urlInput.value = '';
          refreshRemotePackList();
          // 刷新整个卡包列表
          originalOpenCardPackManager();
        } catch (e) {
          statusDiv.innerHTML = `<span style="color: #e74c3c;">✗ ${e.message}</span>`;
        } finally {
          btn.disabled = false;
          btn.textContent = '安装';
        }
      };

      // 刷新远程卡包列表
      function refreshRemotePackList() {
        const listDiv = document.getElementById('remote-pack-list');
        if (!listDiv) return;

        const remotePacks = RemoteCardPackLoader.getRemotePacksInfo();

        if (remotePacks.length === 0) {
          listDiv.innerHTML = '<div style="color: #666; font-size: 12px; text-align: center; padding: 10px;">暂无已安装的远程卡包</div>';
          return;
        }

        listDiv.innerHTML = remotePacks.map(pack => `
          <div style="
            background: rgba(78,205,196,0.1);
            border: 1px solid rgba(78,205,196,0.3);
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
          ">
            <span style="font-size: 20px;">🌐</span>
            <div style="flex: 1; min-width: 0;">
              <div style="color: #4ecdc4; font-weight: bold; font-size: 13px;">${pack.name}</div>
              <div style="color: #888; font-size: 11px;">v${pack.version} | ${pack.author}</div>
              <div style="color: #666; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${pack.sourceUrl}">${pack.sourceUrl}</div>
            </div>
            <button onclick="uninstallRemotePack('${pack.id}')" style="
              padding: 6px 12px;
              background: #e74c3c;
              border: none;
              border-radius: 6px;
              color: #fff;
              font-size: 11px;
              cursor: pointer;
            ">卸载</button>
          </div>
        `).join('');
      }

      // 暴露卸载函数到window
      window.uninstallRemotePack = function(packId) {
        try {
          RemoteCardPackLoader.uninstall(packId);
          refreshRemotePackList();
          // 刷新整个卡包列表
          originalOpenCardPackManager();
        } catch (e) {
          alert('卸载失败: ' + e.message);
        }
      };

      // 初始刷新列表
      refreshRemotePackList();
    }, 0);
  };

  console.log('Market loader initialized. Remote pack support enabled.');
})();
