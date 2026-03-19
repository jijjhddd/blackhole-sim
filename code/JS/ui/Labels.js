// code/JS/ui/Labels.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');

// ========== 状态变量 ==========
let persistentMeteorId = null;
let meteorLabelTimeout = null;
let mouseX = 0;
let mouseY = 0;

/**
 * 设置鼠标位置（由 main.js 调用）
 */
function setMousePosition(x, y) {
    mouseX = x;
    mouseY = y;
}

/**
 * 智能定位标签，避免超出屏幕
 * @param {HTMLElement} label 标签元素
 * @param {number} targetX 目标x坐标（视口坐标）
 * @param {number} targetY 目标y坐标（视口坐标）
 */
function positionLabel(label, targetX, targetY) {
    if (!label) return;
    
    label.classList.remove('below');
    label.style.left = targetX + 'px';
    label.style.top = targetY + 'px';

    const rect = label.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let left = targetX;
    let top = targetY - rect.height - 12; // 默认显示在上方

    // 水平边界调整
    if (left + rect.width > winW - 10) {
        left = winW - rect.width - 10;
    }
    if (left < 10) {
        left = 10;
    }

    // 垂直边界调整：如果上方空间不足，显示在下方
    if (top < 10) {
        top = targetY + 20;
        label.classList.add('below');
    }

    label.style.left = left + 'px';
    label.style.top = top + 'px';
}

/**
 * 获取鼠标悬停的流星
 * @returns {Object|null} 流星对象或null
 */
function getHoveredMeteor() {
    const meteors = state.meteors;
    if (!meteors || meteors.length === 0) return null;
    
    let hovered = null;
    let minDist = Infinity;

    for (const m of meteors) {
        if (m.consumed) continue;
        const d = Math.hypot(mouseX - m.x, mouseY - m.y);
        if (d < m.radius * 3 && d < minDist) {
            minDist = d;
            hovered = m;
        }
    }
    return hovered;
}

/**
 * 更新流星标签的内容和位置
 */
function updateMeteorLabel() {
    const label = document.getElementById('meteorLabel');
    if (!label) return;

    const canvas = state.canvas;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    // 1. 优先显示持久流星
    if (persistentMeteorId) {
        const meteor = state.meteors.find(m => m.listId === persistentMeteorId && !m.consumed);
        if (meteor) {
            const dist = Math.hypot(meteor.x - state.blackHole.x, meteor.y - state.blackHole.y).toFixed(1);
            const survival = ((Date.now() - meteor.createdAt) / 1000).toFixed(1);
            const speed = Math.hypot(meteor.vx, meteor.vy).toFixed(2);
            
            label.innerHTML = `
                <strong>流星 #${meteor.listId}</strong><br>
                位置: (${Math.round(meteor.x)}, ${Math.round(meteor.y)})<br>
                速度: ${speed}<br>
                质量: ${meteor.mass.toFixed(1)}<br>
                距离黑洞: ${dist}<br>
                生存: ${survival}秒
            `;
            label.style.display = 'block';
            positionLabel(label, canvasRect.left + meteor.x, canvasRect.top + meteor.y);
            return;
        } else {
            // 流星已消失，清除持久标记
            persistentMeteorId = null;
        }
    }

    // 2. 显示悬停流星（如果启用了标签）
    if (config.showMeteorLabels) {
        const hovered = getHoveredMeteor();
        if (hovered) {
            const dist = Math.hypot(hovered.x - state.blackHole.x, hovered.y - state.blackHole.y).toFixed(1);
            const speed = Math.hypot(hovered.vx, hovered.vy).toFixed(2);
            
            label.innerHTML = `
                <strong>流星 #${hovered.listId}</strong><br>
                速度: ${speed}<br>
                质量: ${hovered.mass.toFixed(1)}<br>
                距离: ${dist}
            `;
            label.style.display = 'block';
            positionLabel(label, canvasRect.left + hovered.x, canvasRect.top + hovered.y);
            return;
        }
    }

    // 3. 没有需要显示的标签
    label.style.display = 'none';
}

/**
 * 显示流星信息
 * @param {number} meteorId 流星ID
 * @param {boolean} persistent 是否为持久显示
 */
function showMeteorInfo(meteorId, persistent = false) {
    const meteor = state.meteors.find(m => m.listId === meteorId);
    if (!meteor || meteor.consumed) {
        addLog(`流星 #${meteorId} 不存在或已消失`, 'warning');
        return;
    }

    if (persistent) {
        // 持久显示：切换状态
        if (persistentMeteorId === meteorId) {
            persistentMeteorId = null;
            hideMeteorLabel();
            addLog(`流星 #${meteorId} 信息持久显示已关闭`, 'info');
        } else {
            persistentMeteorId = meteorId;
            setTimeout(() => updateMeteorLabel(), 0);
            addLog(`流星 #${meteorId} 信息持久显示`, 'info');
        }
    } else {
        // 临时显示3秒
        if (meteorLabelTimeout) clearTimeout(meteorLabelTimeout);
        persistentMeteorId = null;

        const canvas = state.canvas;
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const label = document.getElementById('meteorLabel');
        if (!label) return;
        
        const dist = Math.hypot(meteor.x - state.blackHole.x, meteor.y - state.blackHole.y).toFixed(1);
        const survival = ((Date.now() - meteor.createdAt) / 1000).toFixed(1);
        const speed = Math.hypot(meteor.vx, meteor.vy).toFixed(2);
        
        label.innerHTML = `
            <strong>流星 #${meteor.listId}</strong><br>
            位置: (${Math.round(meteor.x)}, ${Math.round(meteor.y)})<br>
            速度: ${speed}<br>
            质量: ${meteor.mass.toFixed(1)}<br>
            距离黑洞: ${dist}<br>
            生存: ${survival}秒
        `;
        label.style.display = 'block';
        positionLabel(label, canvasRect.left + meteor.x, canvasRect.top + meteor.y);

        meteorLabelTimeout = setTimeout(() => {
            label.style.display = 'none';
        }, 3000);
    }
}

/**
 * 隐藏流星标签
 */
function hideMeteorLabel() {
    persistentMeteorId = null;
    if (meteorLabelTimeout) {
        clearTimeout(meteorLabelTimeout);
        meteorLabelTimeout = null;
    }
    const label = document.getElementById('meteorLabel');
    if (label) {
        label.style.display = 'none';
    }
}

// 确保所有函数都被正确导出
module.exports = {
    setMousePosition: setMousePosition,
    updateMeteorLabel: updateMeteorLabel,
    showMeteorInfo: showMeteorInfo,
    hideMeteorLabel: hideMeteorLabel,
    persistentMeteorId: persistentMeteorId,
    meteorLabelTimeout: meteorLabelTimeout
};
