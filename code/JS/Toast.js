// code/JS/ui/Toast.js

/**
 * 飘窗提示模块
 * 用于在屏幕上方显示短暂的操作反馈信息
 * 支持多个提示自动排列，新提示出现在顶部，旧提示下移
 */

// 默认配置
const DEFAULT_DURATION = 3000; // 默认显示3秒
const MAX_TOASTS = 5; // 最多同时显示5个提示
const TOAST_SPACING = 10; // 提示之间的间距（像素）
const TOAST_TOP_START = 20; // 第一个提示距离顶部的距离

// 当前显示的提示数组，按从上到下的顺序存储（第一个为最上方）
let activeToasts = [];

/**
 * 重新计算所有提示的位置（从上到下依次排列）
 */
function recalcToastPositions() {
    let currentTop = TOAST_TOP_START;
    activeToasts.forEach(toastInfo => {
        const element = toastInfo.element;
        // 确保元素存在且可见
        if (!element || !element.parentNode) return;
        
        // 获取实际高度（可能因为内容变化）
        const height = element.offsetHeight;
        toastInfo.height = height;
        
        // 设置新位置，触发 transition 动画
        element.style.top = currentTop + 'px';
        
        currentTop += height + TOAST_SPACING;
    });
}

/**
 * 移除指定提示
 * @param {HTMLElement} toast 要移除的提示元素
 */
function removeToast(toast) {
    const index = activeToasts.findIndex(t => t.element === toast);
    if (index === -1) return;

    const toastInfo = activeToasts[index];
    if (toastInfo.timeout) {
        clearTimeout(toastInfo.timeout);
    }

    // 从数组中移除
    activeToasts.splice(index, 1);

    // 淡出动画
    toast.style.opacity = '0';

    // 延迟后重新计算剩余提示的位置（让它们向上移动）
    setTimeout(() => {
        recalcToastPositions();
    }, 50);

    // 最后移除 DOM 元素
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * 创建一个飘窗提示
 * @param {string} message 提示消息
 * @param {string} type 类型：'success', 'error', 'info', 'warning'
 * @param {number} duration 显示时长（毫秒）
 * @returns {HTMLElement} 创建的提示元素
 */
function showToast(message, type = 'info', duration = DEFAULT_DURATION) {
    // 如果已存在相同消息的提示，先移除
    const existingIndex = activeToasts.findIndex(t => t.message === message);
    if (existingIndex !== -1) {
        removeToast(activeToasts[existingIndex].element);
        // 等待移除完成后再创建新提示（避免冲突）
        setTimeout(() => _createToast(message, type, duration), 350);
        return;
    }
    
    return _createToast(message, type, duration);
}

/**
 * 内部创建提示（不进行重复检查）
 */
function _createToast(message, type, duration) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // 根据类型设置图标和颜色
    let icon = '';
    let bgColor = '';
    let borderColor = '';
    switch (type) {
        case 'success':
            icon = '✅';
            bgColor = 'rgba(0,100,0,0.95)';
            borderColor = '#4caf50';
            break;
        case 'error':
            icon = '❌';
            bgColor = 'rgba(150,0,0,0.95)';
            borderColor = '#f44336';
            break;
        case 'warning':
            icon = '⚠️';
            bgColor = 'rgba(150,100,0,0.95)';
            borderColor = '#ff9800';
            break;
        default:
            icon = 'ℹ️';
            bgColor = 'rgba(0,50,100,0.95)';
            borderColor = '#2196f3';
    }
    
    toast.innerHTML = `
        <span class="toast-icon" style="margin-right: 8px;">${icon}</span>
        <span class="toast-message" style="flex: 1;">${message}</span>
        <button class="toast-close" style="background:none; border:none; color:#aaa; cursor:pointer; margin-left:8px;">✕</button>
    `;
    
    // 基础样式
    toast.style.cssText = `
        position: fixed;
        right: 20px;
        min-width: 250px;
        max-width: 350px;
        padding: 12px 16px;
        background: ${bgColor};
        backdrop-filter: blur(5px);
        border-left: 4px solid ${borderColor};
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        color: #fff;
        font-size: 14px;
        z-index: 1000000;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 1;
        transition: top 0.3s ease, opacity 0.3s ease;
        pointer-events: all;
        font-weight: 500;
        margin: 0;
    `;
    
    // 关闭按钮事件
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
    closeBtn.onmouseout = () => closeBtn.style.color = '#aaa';
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        removeToast(toast);
    };
    
    document.body.appendChild(toast);
    
    // 获取高度
    const height = toast.offsetHeight;
    
    // 创建 toastInfo 对象，插入到数组最前面（新提示在上方）
    const toastInfo = { element: toast, message, type, timeout: null, height };
    activeToasts.unshift(toastInfo);
    
    // 限制最大数量
    if (activeToasts.length > MAX_TOASTS) {
        const oldest = activeToasts.pop();
        removeToast(oldest.element);
    }
    
    // 重新计算所有提示的位置
    recalcToastPositions();
    
    // 设置自动关闭定时器
    toastInfo.timeout = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    return toast;
}

/**
 * 成功提示
 * @param {string} message 提示消息
 * @param {number} duration 显示时长（毫秒）
 */
function showSuccess(message, duration) {
    return showToast(message, 'success', duration);
}

/**
 * 错误提示
 * @param {string} message 提示消息
 * @param {number} duration 显示时长（毫秒）
 */
function showError(message, duration) {
    return showToast(message, 'error', duration);
}

/**
 * 警告提示
 * @param {string} message 提示消息
 * @param {number} duration 显示时长（毫秒）
 */
function showWarning(message, duration) {
    return showToast(message, 'warning', duration);
}

/**
 * 信息提示
 * @param {string} message 提示消息
 * @param {number} duration 显示时长（毫秒）
 */
function showInfo(message, duration) {
    return showToast(message, 'info', duration);
}

/**
 * 清除所有提示
 */
function clearAllToasts() {
    [...activeToasts].forEach(t => removeToast(t.element));
}

module.exports = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts
};
