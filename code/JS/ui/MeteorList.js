// code/JS/ui/MeteorList.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');
const { blackHole } = require('../state.js');
const { showMeteorDetail } = require('./MeteorDetail.js');
const { showMeteorInfo } = require('./Labels.js');

// 从数据核心模块导入
const meteorDataCore = require('../data/MeteorDataCore.js');

const {
    meteorList,
    highlightedMeteorId,
    clearMeteorList,
    highlightMeteor,
    removeMeteorFromList,
    setShowDistanceInList,
    setShowSurvivalTimeInList,
    setShowMassInList,
    setMeteorListFilter,
    cleanupExpiredMeteors
} = meteorDataCore;

let showDistanceInList = false;
let showSurvivalTimeInList = false;
let showMassInList = false;
let meteorListFilter = 'all';

let cleanupTimer = null;

function startAutoCleanup() {
    if (cleanupTimer) clearInterval(cleanupTimer);
    cleanupTimer = setInterval(() => {
        const removed = cleanupExpiredMeteors();
        if (removed > 0) updateMeteorListDisplay();
    }, 1000);
}

function stopAutoCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}

function injectMeteorListSettings() {
    const subtab = document.getElementById('meteor-list-subtab');
    if (!subtab || document.getElementById('listDisplaySettings')) return;

    const settingsDiv = document.createElement('div');
    settingsDiv.id = 'listDisplaySettings';
    settingsDiv.className = 'list-settings';
    settingsDiv.innerHTML = `
        <h4><i class="fas fa-sliders-h"></i> 流星列表显示设置</h4>
        <div class="checkbox-group">
            <label style="display: flex; align-items: center; gap: 6px; color: #a0c8ff;">
                <input type="checkbox" id="showDistanceInListCheckbox"> 显示距离黑洞
            </label>
            <label style="display: flex; align-items: center; gap: 6px; color: #a0c8ff;">
                <input type="checkbox" id="showSurvivalTimeInListCheckbox"> 显示生存时间
            </label>
            <label style="display: flex; align-items: center; gap: 6px; color: #a0c8ff;">
                <input type="checkbox" id="showMassInListCheckbox"> 显示质量
            </label>
        </div>
        <div style="margin-top:8px; color:#88aaff; font-size:0.75rem;">
            <i class="fas fa-info-circle"></i> 勾选后将在列表对应列显示额外信息
        </div>
    `;

    const controls = subtab.querySelector('.meteor-list-controls');
    const container = subtab.querySelector('.meteor-list-container');
    if (controls && container) subtab.insertBefore(settingsDiv, container);

    document.getElementById('showDistanceInListCheckbox')?.addEventListener('change', function(e) {
        showDistanceInList = e.target.checked;
        setShowDistanceInList(showDistanceInList);
        updateMeteorListDisplay();
        addLog(`流星列表显示距离${showDistanceInList ? '开启' : '关闭'}`, 'info');
    });
    document.getElementById('showSurvivalTimeInListCheckbox')?.addEventListener('change', function(e) {
        showSurvivalTimeInList = e.target.checked;
        setShowSurvivalTimeInList(showSurvivalTimeInList);
        updateMeteorListDisplay();
        addLog(`流星列表显示生存时间${showSurvivalTimeInList ? '开启' : '关闭'}`, 'info');
    });
    document.getElementById('showMassInListCheckbox')?.addEventListener('change', function(e) {
        showMassInList = e.target.checked;
        setShowMassInList(showMassInList);
        updateMeteorListDisplay();
        addLog(`流星列表显示质量${showMassInList ? '开启' : '关闭'}`, 'info');
    });
}

function updateMeteorListDisplay() {
    const container = document.getElementById('meteorListContainer');
    const emptyMessage = document.getElementById('meteorListEmpty');
    if (!container || !emptyMessage) return;

    cleanupExpiredMeteors();

    const currentList = meteorDataCore.meteorList;

    if (currentList.length === 0) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.innerHTML = '<i class="fas fa-meteor"></i><p>当前没有流星数据</p>';
        return;
    }

    let filtered = currentList;
    if (meteorListFilter === 'active') filtered = currentList.filter(m => !m.consumed && !m.removed);
    else if (meteorListFilter === 'consumed') filtered = currentList.filter(m => m.consumed);
    else if (meteorListFilter === 'removed') filtered = currentList.filter(m => m.removed && !m.consumed);

    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'meteor-list-header';
    header.innerHTML = '<div>颜色/ID</div><div>位置</div><div>速度</div><div>大小</div><div>质量</div><div>状态/操作</div>';
    container.appendChild(header);

    if (filtered.length === 0) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.innerHTML = '<i class="fas fa-filter"></i><p>当前筛选无匹配流星</p>';
        return;
    }

    container.style.display = 'block';
    emptyMessage.style.display = 'none';

    filtered.forEach(info => {
        const item = document.createElement('div');
        let cls = 'meteor-list-item';
        if (info.consumed) cls += ' consumed';
        else if (info.removed) cls += ' removed';
        if (highlightedMeteorId === info.id) cls += ' highlighted';
        item.className = cls;
        item.dataset.id = info.id;

        const survival = info.finalSurvivalTime !== null ? info.finalSurvivalTime : (Date.now() - info.createdAt) / 1000;
        const distance = Math.hypot(info.x - blackHole.x, info.y - blackHole.y).toFixed(1);
        
        let statusText = '活跃', statusClass = 'status-active';
        if (info.consumed) { statusText = '已吞噬'; statusClass = 'status-consumed'; }
        else if (info.removed) { statusText = '已移除'; statusClass = 'status-removed'; }

        let extraHtml = '';
        if (showDistanceInList) extraHtml += `<br><span style="font-size:0.65rem;">距离: ${distance}</span>`;
        if (showSurvivalTimeInList) extraHtml += `<br><span style="font-size:0.65rem;">生存: ${survival.toFixed(1)}s</span>`;
        if (showMassInList) extraHtml += `<br><span style="font-size:0.65rem;">质量: ${info.mass.toFixed(1)}</span>`;

        item.innerHTML = `
            <div>
                <span class="meteor-color-indicator" style="background-color: ${info.color};"></span>
                #${info.id}
                ${extraHtml}
            </div>
            <div>(${Math.round(info.x)}, ${Math.round(info.y)})</div>
            <div>${info.speed.toFixed(2)}</div>
            <div>${info.radius.toFixed(1)}</div>
            <div>${info.mass.toFixed(1)}</div>
            <div>
                <span class="meteor-status ${statusClass}">${statusText}</span>
                <div class="meteor-actions">
                    <button class="meteor-action-btn view-detail" data-id="${info.id}" title="查看详情"><i class="fas fa-eye"></i></button>
                    <button class="meteor-action-btn show-info" data-id="${info.id}" title="显示信息"><i class="fas fa-info-circle"></i></button>
                    <button class="meteor-action-btn camera-follow" data-id="${info.id}" title="摄像机跟随"><i class="fas fa-video"></i></button>
                    <button class="meteor-action-btn remove" data-id="${info.id}" title="删除流星"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });

    container.querySelectorAll('.view-detail').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); showMeteorDetail(parseInt(btn.dataset.id)); });
    });
    container.querySelectorAll('.show-info').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); showMeteorInfo(parseInt(btn.dataset.id), true); });
    });
    container.querySelectorAll('.camera-follow').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            if (window.simulator && window.simulator.followMeteor) window.simulator.followMeteor(id);
        });
    });
    container.querySelectorAll('.meteor-action-btn.remove').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            removeMeteorFromList(parseInt(btn.dataset.id));
            updateMeteorListDisplay();
        });
    });
    container.querySelectorAll('.meteor-list-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.classList.contains('meteor-action-btn')) showMeteorDetail(parseInt(this.dataset.id));
        });
    });
}

function bindMeteorFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            meteorListFilter = this.dataset.filter;
            setMeteorListFilter(meteorListFilter);
            updateMeteorListDisplay();
            addLog(`流星筛选: ${this.textContent}`, 'info');
        });
    });
}

function initMeteorList() {
    const clearBtn = document.getElementById('clearMeteorListBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearMeteorList();
            updateMeteorListDisplay();
        });
    }
    bindMeteorFilterButtons();
    injectMeteorListSettings();
    startAutoCleanup();
    addLog('流星列表模块初始化完成', 'info');
}

module.exports = {
    updateMeteorListDisplay,
    initMeteorList
};
