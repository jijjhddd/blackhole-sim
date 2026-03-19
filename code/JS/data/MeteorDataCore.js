// code/JS/data/MeteorDataCore.js

const state = require('../state.js');
const { addLog } = require('../utils/logger.js');
const { REMOVAL_DELAY } = require('../constants.js');

// ========== 流星列表数据 ==========
let meteorList = [];
let nextMeteorId = 1;
let selectedMeteorId = null;
let highlightedMeteorId = null;

// ========== 流星列表显示设置 ==========
let showDistanceInList = false;
let showSurvivalTimeInList = false;
let showMassInList = false;
let meteorListFilter = 'all';

/**
 * 将流星添加到列表中
 * @param {Object} meteor 流星对象
 * @returns {Object} 添加的流星信息对象
 */
function addMeteorToList(meteor) {
    const id = nextMeteorId++;
    const meteorInfo = {
        id: id,
        color: meteor.color,
        x: meteor.x, y: meteor.y,
        vx: meteor.vx, vy: meteor.vy,
        speed: Math.hypot(meteor.vx, meteor.vy),
        radius: meteor.radius,
        mass: meteor.mass,
        createdAt: meteor.createdAt,
        consumed: meteor.consumed,
        removed: false,
        removalTime: null,
        manual: meteor.manual || false,
        meteorObject: meteor,
        finalSurvivalTime: null,
        speedHistory: [],
        distanceHistory: [],
        massHistory: [],
        xHistory: [], yHistory: [],
        timestampHistory: []
    };
    
    meteorList.unshift(meteorInfo);
    meteor.listId = id;
    
    addLog(`MeteorDataCore: 添加流星 #${id}`, 'debug');
    
    return meteorInfo;
}

/**
 * 从存档恢复流星到列表（保留原有 ID）
 * @param {Object} meteor 流星对象
 * @param {Object} savedInfo 存档中的流星信息
 * @returns {Object} 恢复的流星信息对象
 */
function restoreMeteorToList(meteor, savedInfo) {
    // 使用保存的 ID，不改变 nextMeteorId
    const id = savedInfo.id;
    const meteorInfo = {
        id: id,
        color: meteor.color,
        x: meteor.x, y: meteor.y,
        vx: meteor.vx, vy: meteor.vy,
        speed: savedInfo.speed, // 使用保存的速度，避免实时计算偏差
        radius: meteor.radius,
        mass: meteor.mass,
        createdAt: savedInfo.createdAt,
        consumed: savedInfo.consumed || false,
        removed: savedInfo.removed || false,
        removalTime: savedInfo.removalTime || null,
        manual: savedInfo.manual || false,
        meteorObject: meteor,
        finalSurvivalTime: savedInfo.finalSurvivalTime || null,
        speedHistory: savedInfo.speedHistory || [],
        distanceHistory: savedInfo.distanceHistory || [],
        massHistory: savedInfo.massHistory || [],
        xHistory: savedInfo.xHistory || [],
        yHistory: savedInfo.yHistory || [],
        timestampHistory: savedInfo.timestampHistory || []
    };
    
    meteorList.push(meteorInfo); // 保持原始顺序，不强制 unshift
    meteor.listId = id;
    
    addLog(`MeteorDataCore: 恢复流星 #${id}`, 'debug');
    
    return meteorInfo;
}

/**
 * 更新列表中的流星信息
 * @param {Object} meteor 流星对象
 */
function updateMeteorInList(meteor) {
    if (!meteor.listId) {
        addLog(`updateMeteorInList: 流星没有listId`, 'warn');
        return;
    }
    
    const info = meteorList.find(m => m.id === meteor.listId);
    if (!info) {
        addLog(`updateMeteorInList: 找不到流星 #${meteor.listId}`, 'warn');
        return;
    }
    
    info.x = meteor.x; info.y = meteor.y;
    info.vx = meteor.vx; info.vy = meteor.vy;
    info.speed = Math.hypot(meteor.vx, meteor.vy);
    info.mass = meteor.mass;
    
    // 检查状态变化
    if (meteor.consumed && !info.consumed) {
        info.consumed = true;
        info.removalTime = Date.now() + REMOVAL_DELAY;
        info.finalSurvivalTime = (Date.now() - info.createdAt) / 1000;
        addLog(`流星 #${info.id} 被吞噬，将在 ${REMOVAL_DELAY/1000} 秒后自动移除`, 'info');
    }
    
    if (meteor.removed && !info.removed && !info.consumed) {
        info.removed = true;
        info.removalTime = Date.now() + REMOVAL_DELAY;
        info.finalSurvivalTime = (Date.now() - info.createdAt) / 1000;
        addLog(`流星 #${info.id} 飞出边界，将在 ${REMOVAL_DELAY/1000} 秒后自动移除`, 'info');
    }
    
    // 记录历史数据（用于图表）
    const now = Date.now();
    const timeSinceStart = (now - info.createdAt) / 1000;
    const distance = Math.hypot(meteor.x - state.blackHole.x, meteor.y - state.blackHole.y);
    
    info.speedHistory.push(info.speed);
    info.distanceHistory.push(distance);
    info.massHistory.push(info.mass);
    info.xHistory.push(meteor.x);
    info.yHistory.push(meteor.y);
    info.timestampHistory.push(timeSinceStart);
    
    const maxHistory = 50;
    if (info.speedHistory.length > maxHistory) {
        info.speedHistory.shift();
        info.distanceHistory.shift();
        info.massHistory.shift();
        info.xHistory.shift();
        info.yHistory.shift();
        info.timestampHistory.shift();
    }
}

/**
 * 标记流星为已移除（飞出边界）
 * @param {Object} meteor 流星对象
 */
function markMeteorAsRemoved(meteor) {
    if (!meteor.listId) return;
    
    const info = meteorList.find(m => m.id === meteor.listId);
    if (info && !info.removed && !info.consumed) {
        info.removed = true;
        info.removalTime = Date.now() + REMOVAL_DELAY;
        info.finalSurvivalTime = (Date.now() - info.createdAt) / 1000;
        
        // 同时在meteor对象上标记
        meteor.removed = true;
        addLog(`流星 #${info.id} 飞出边界，将在 ${REMOVAL_DELAY/1000} 秒后自动移除`, 'info');
    }
}

/**
 * 从列表中永久删除流星
 * @param {number} meteorId 流星ID
 */
function removeMeteorFromList(meteorId) {
    const index = meteorList.findIndex(m => m.id === meteorId);
    if (index !== -1) {
        const info = meteorList[index];
        
        // 从 state.meteors 中移除对应的流星对象
        if (info.meteorObject) {
            const mIndex = state.meteors.findIndex(m => m.listId === meteorId);
            if (mIndex !== -1) {
                state.meteors.splice(mIndex, 1);
            }
        }
        
        meteorList.splice(index, 1);
        addLog(`流星 #${meteorId} 已从列表中手动删除`, 'info');
        
        if (selectedMeteorId === meteorId) {
            selectedMeteorId = null;
        }
        if (highlightedMeteorId === meteorId) {
            highlightedMeteorId = null;
        }
    }
}

/**
 * 清理过期的流星
 * @returns {number} 清理的数量
 */
function cleanupExpiredMeteors() {
    const now = Date.now();
    let removed = 0;
    const beforeCount = meteorList.length;
    
    for (let i = meteorList.length - 1; i >= 0; i--) {
        const m = meteorList[i];
        if ((m.consumed || m.removed) && m.removalTime && now >= m.removalTime) {
            meteorList.splice(i, 1);
            removed++;
        }
    }
    
    if (removed > 0) {
        addLog(`自动清理了 ${removed} 个过期流星 (列表从 ${beforeCount} 变为 ${meteorList.length})`, 'info');
    }
    
    return removed;
}

/**
 * 清空所有流星
 */
function clearMeteorList() {
    meteorList = [];
    highlightedMeteorId = null;
    addLog('已清空所有流星数据', 'warning');
}

/**
 * 高亮流星
 * @param {number} meteorId 流星ID
 */
function highlightMeteor(meteorId) {
    if (highlightedMeteorId === meteorId) {
        highlightedMeteorId = null;
        addLog(`流星 #${meteorId} 高亮取消`, 'info');
    } else {
        highlightedMeteorId = meteorId;
        addLog(`流星 #${meteorId} 已高亮`, 'info');
    }
}

// 导出所有核心函数和变量
module.exports = {
    // 数据
    meteorList,
    nextMeteorId,
    selectedMeteorId,
    highlightedMeteorId,
    showDistanceInList,
    showSurvivalTimeInList,
    showMassInList,
    meteorListFilter,
    
    // 核心函数
    addMeteorToList,
    restoreMeteorToList,
    updateMeteorInList,
    markMeteorAsRemoved,
    removeMeteorFromList,
    cleanupExpiredMeteors,
    clearMeteorList,
    highlightMeteor,
    
    // 设置函数
    setShowDistanceInList: (value) => { showDistanceInList = value; },
    setShowSurvivalTimeInList: (value) => { showSurvivalTimeInList = value; },
    setShowMassInList: (value) => { showMassInList = value; },
    setMeteorListFilter: (value) => { meteorListFilter = value; }
};
