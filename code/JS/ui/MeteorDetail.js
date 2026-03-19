// code/JS/ui/MeteorDetail.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');
const { showMeteorInfo, hideMeteorLabel } = require('./Labels.js');
const { destroyMeteor } = require('../physics/engine.js');

const meteorDataCore = require('../data/MeteorDataCore.js');
const meteorList = meteorDataCore.meteorList;
const { highlightMeteor, removeMeteorFromList } = meteorDataCore;

let selectedMeteorId = null;

let meteorSpeedDetailChart = null;
let meteorDistanceChart = null;
let meteorXPositionChart = null;
let meteorYPositionChart = null;
let meteorMassChart = null;

function showMeteorDetail(meteorId) {
    addLog(`[MeteorDetail] 尝试打开流星 #${meteorId} 详情`, 'debug');
    
    const info = meteorList.find(m => m.id === meteorId);
    if (!info) {
        addLog(`无法找到流星 #${meteorId}`, 'warning');
        return;
    }

    selectedMeteorId = meteorId;
    const modal = document.getElementById('meteorDetailModal');
    const overlay = document.getElementById('meteorDetailOverlay');
    if (!modal || !overlay) {
        addLog('流星详情模态框元素不存在', 'error');
        return;
    }
    
    document.getElementById('modalMeteorTitle').textContent = `流星 #${info.id} 详情`;
    updateMeteorDetail(info);
    modal.style.display = 'block';
    overlay.style.display = 'block';
    updateMeteorDetailCharts(info);
    addLog(`打开流星 #${info.id} 详情`, 'info');
}

function updateCurrentMeteorDetail() {
    if (!selectedMeteorId) return;
    const info = meteorList.find(m => m.id === selectedMeteorId);
    if (!info) {
        closeMeteorDetail();
        return;
    }
    updateMeteorDetail(info);
    updateMeteorDetailCharts(info);
}

function updateMeteorDetail(info) {
    if (!info) return;
    const body = document.getElementById('modalMeteorBody');
    if (!body) return;
    
    const survival = info.finalSurvivalTime !== null ? info.finalSurvivalTime : (Date.now() - info.createdAt) / 1000;
    const distance = Math.hypot(info.x - state.blackHole.x, info.y - state.blackHole.y).toFixed(1);
    
    let status = '活跃';
    if (info.consumed) status = '已吞噬';
    else if (info.removed) status = '已移除';

    body.innerHTML = `
        <div class="modal-detail-item">
            <div class="modal-detail-label">流星ID</div>
            <div class="modal-detail-value">#${info.id}</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">颜色</div>
            <div class="modal-detail-value color">
                <span class="meteor-color-indicator" style="background-color: ${info.color};"></span>
                ${info.color}
            </div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">当前位置</div>
            <div class="modal-detail-value">(${info.x.toFixed(1)}, ${info.y.toFixed(1)})</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">速度</div>
            <div class="modal-detail-value">${info.speed.toFixed(2)} 像素/帧</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">速度分量</div>
            <div class="modal-detail-value">vx: ${info.vx.toFixed(2)}, vy: ${info.vy.toFixed(2)}</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">大小</div>
            <div class="modal-detail-value">${info.radius.toFixed(1)} 像素</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">质量</div>
            <div class="modal-detail-value">${info.mass.toFixed(2)}</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">距离黑洞</div>
            <div class="modal-detail-value">${distance} 像素</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">状态</div>
            <div class="modal-detail-value">${status}</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">生存时间</div>
            <div class="modal-detail-value">${survival.toFixed(1)} 秒</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">创建时间</div>
            <div class="modal-detail-value">${new Date(info.createdAt).toLocaleTimeString()}</div>
        </div>
        <div class="modal-detail-item">
            <div class="modal-detail-label">创建方式</div>
            <div class="modal-detail-value">${info.manual ? '手动点击' : '自动生成'}</div>
        </div>
    `;
}

function updateMeteorDetailCharts(info) {
    if (typeof Chart === 'undefined') return;
    if (!info || info.speedHistory.length < 2) return;
    const animation = config.chartAnimations ? { duration: 500, easing: 'easeOutQuart' } : { duration: 0 };

    try {
        if (meteorSpeedDetailChart) meteorSpeedDetailChart.destroy();
        meteorSpeedDetailChart = new Chart(document.getElementById('meteorSpeedDetailChart'), {
            type: 'line',
            data: {
                labels: info.timestampHistory.map(t => t.toFixed(1)),
                datasets: [{
                    label: '速度 (像素/帧)',
                    data: info.speedHistory,
                    borderColor: '#4a9eff',
                    backgroundColor: 'rgba(74,158,255,0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation,
                plugins: { legend: { labels: { color: '#a0c8ff' } } },
                scales: {
                    x: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } },
                    y: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' }, beginAtZero: true }
                }
            }
        });
    } catch (e) { console.error('速度图表更新失败', e); }

    try {
        if (meteorDistanceChart) meteorDistanceChart.destroy();
        meteorDistanceChart = new Chart(document.getElementById('meteorDistanceChart'), {
            type: 'line',
            data: {
                labels: info.timestampHistory.map(t => t.toFixed(1)),
                datasets: [{
                    label: '距离黑洞 (像素)',
                    data: info.distanceHistory,
                    borderColor: '#ff5555',
                    backgroundColor: 'rgba(255,85,85,0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation,
                plugins: { legend: { labels: { color: '#a0c8ff' } } },
                scales: {
                    x: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } },
                    y: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' }, beginAtZero: true }
                }
            }
        });
    } catch (e) { console.error('距离图表更新失败', e); }

    try {
        if (meteorXPositionChart) meteorXPositionChart.destroy();
        meteorXPositionChart = new Chart(document.getElementById('meteorXPositionChart'), {
            type: 'line',
            data: {
                labels: info.timestampHistory.map(t => t.toFixed(1)),
                datasets: [{
                    label: 'X坐标',
                    data: info.xHistory,
                    borderColor: '#55ff55',
                    backgroundColor: 'rgba(85,255,85,0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation,
                plugins: { legend: { labels: { color: '#a0c8ff' } } },
                scales: {
                    x: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } },
                    y: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } }
                }
            }
        });
    } catch (e) { console.error('X坐标图表更新失败', e); }

    try {
        if (meteorYPositionChart) meteorYPositionChart.destroy();
        meteorYPositionChart = new Chart(document.getElementById('meteorYPositionChart'), {
            type: 'line',
            data: {
                labels: info.timestampHistory.map(t => t.toFixed(1)),
                datasets: [{
                    label: 'Y坐标',
                    data: info.yHistory,
                    borderColor: '#ffaa55',
                    backgroundColor: 'rgba(255,170,85,0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation,
                plugins: { legend: { labels: { color: '#a0c8ff' } } },
                scales: {
                    x: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } },
                    y: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } }
                }
            }
        });
    } catch (e) { console.error('Y坐标图表更新失败', e); }

    try {
        if (meteorMassChart) meteorMassChart.destroy();
        meteorMassChart = new Chart(document.getElementById('meteorMassChart'), {
            type: 'line',
            data: {
                labels: info.timestampHistory.map(t => t.toFixed(1)),
                datasets: [{
                    label: '质量',
                    data: info.massHistory,
                    borderColor: '#aa55ff',
                    backgroundColor: 'rgba(170,85,255,0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation,
                plugins: { legend: { labels: { color: '#a0c8ff' } } },
                scales: {
                    x: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } },
                    y: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' }, beginAtZero: true }
                }
            }
        });
    } catch (e) { console.error('质量图表更新失败', e); }
}

function closeMeteorDetail() {
    const modal = document.getElementById('meteorDetailModal');
    const overlay = document.getElementById('meteorDetailOverlay');
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    selectedMeteorId = null;
}

function initMeteorDetailButtons() {
    addLog('[MeteorDetail] 初始化按钮事件', 'debug');
    
    const closeModalBtn = document.getElementById('closeMeteorModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeMeteorDetail);
    const closeDetailBtn = document.getElementById('closeMeteorDetailBtn');
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeMeteorDetail);
    const overlay = document.getElementById('meteorDetailOverlay');
    if (overlay) overlay.addEventListener('click', closeMeteorDetail);

    const highlightBtn = document.getElementById('highlightMeteorBtn');
    if (highlightBtn) {
        highlightBtn.addEventListener('click', () => {
            if (selectedMeteorId) highlightMeteor(selectedMeteorId);
        });
    }

    const showInfoBtn = document.getElementById('showMeteorInfoBtn');
    if (showInfoBtn) {
        showInfoBtn.addEventListener('click', () => {
            if (selectedMeteorId) showMeteorInfo(selectedMeteorId, true);
        });
    }

    const destroyBtn = document.getElementById('destroyMeteorBtn');
    if (destroyBtn) {
        destroyBtn.addEventListener('click', async () => {
            if (selectedMeteorId) {
                const info = meteorList?.find(m => m.id === selectedMeteorId);
                if (info && info.meteorObject && !info.meteorObject.consumed && !info.meteorObject.removed) {
                    destroyMeteor(info.meteorObject);
                    closeMeteorDetail();
                } else addLog(`流星 #${selectedMeteorId} 已无法摧毁`, 'warning');
            }
        });
    }

    const removeBtn = document.getElementById('removeMeteorFromListBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            if (selectedMeteorId) {
                removeMeteorFromList(selectedMeteorId);
                closeMeteorDetail();
            }
        });
    }

    // 摄像机跟随按钮
    const followBtn = document.getElementById('followMeteorBtn');
    if (followBtn) {
        followBtn.addEventListener('click', () => {
            if (selectedMeteorId && window.simulator && window.simulator.followMeteor) {
                window.simulator.followMeteor(selectedMeteorId);
                closeMeteorDetail(); // 可关闭或不关闭
            }
        });
    }
}

module.exports = {
    showMeteorDetail,
    updateMeteorDetail,
    updateMeteorDetailCharts,
    closeMeteorDetail,
    initMeteorDetailButtons,
    updateCurrentMeteorDetail
};
