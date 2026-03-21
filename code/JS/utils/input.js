// code/JS/utils/input.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('./logger.js');
const Meteor = require('../physics/Meteor.js');

let mouseX = 0;
let mouseY = 0;
let isLongPressActive = false;
let longPressTimer = null;
let longPressInterval = null;
let lastDragX = 0;
let lastDragY = 0;
let lastDragTime = 0;
let ignoreNextClick = false;

let longPressDelay = 500;
let longPressIntervalTime = 100;
let swipePlacementSpeed = 5;
let safetyZoneRadius = 150;

// 放置流星的回调函数（由 main.js 传入）
let placeMeteorCallback = null;

function updateInputConfig() {
    longPressDelay = config.longPressDelay;
    longPressIntervalTime = config.longPressIntervalTime;
    swipePlacementSpeed = config.swipePlacementSpeed;
    safetyZoneRadius = config.safetyZoneRadius;
}

config.onChange('longPressDelay', (value) => { longPressDelay = value; });
config.onChange('longPressIntervalTime', (value) => { longPressIntervalTime = value; });
config.onChange('swipePlacementSpeed', (value) => { swipePlacementSpeed = value; });
config.onChange('safetyZoneRadius', (value) => { safetyZoneRadius = value; });

// 监听摄像机移动开关，如果开启则取消长按放置
config.onChange('cameraMoveEnabled', (value) => {
    if (value) {
        stopLongPress();
    }
});

function getMousePosition() {
    return { x: mouseX, y: mouseY };
}

function setMousePosition(x, y) {
    mouseX = x;
    mouseY = y;
}

function isInSafetyZone(x, y) {
    const dist = Math.hypot(x - state.blackHole.x, y - state.blackHole.y);
    return dist <= safetyZoneRadius;
}

function placeMeteor(x, y) {
    if (!placeMeteorCallback) return false;
    if (isInSafetyZone(x, y)) {
        addLog('放置位置在安全区内', 'warning');
        return false;
    }
    placeMeteorCallback(x, y);
    return true;
}

function startLongPress(x, y) {
    // 如果摄像机移动开启，则禁用长按放置
    if (config.cameraMoveEnabled) return;
    if (!config.longPressAddMeteors) return;
    
    if (longPressTimer) clearTimeout(longPressTimer);
    
    longPressTimer = setTimeout(() => {
        if (isInSafetyZone(x, y)) {
            addLog('长按位置在安全区内', 'warning');
            return;
        }
        
        isLongPressActive = true;
        ignoreNextClick = true;
        lastDragX = x;
        lastDragY = y;
        lastDragTime = Date.now();
        addLog('长按快速放置流星已激活', 'info');
        
        placeMeteor(x, y);
        
        if (longPressInterval) clearInterval(longPressInterval);
        longPressInterval = setInterval(() => {
            if (isLongPressActive && config.longPressAddMeteors && !config.cameraMoveEnabled) {
                placeMeteor(lastDragX, lastDragY);
            }
        }, longPressIntervalTime);
        
    }, longPressDelay);
}

function handleDrag(x, y) {
    if (!isLongPressActive || !config.longPressAddMeteors || config.cameraMoveEnabled) return;
    
    const now = Date.now();
    const dx = x - lastDragX;
    const dy = y - lastDragY;
    const dist = Math.hypot(dx, dy);
    const timeDiff = now - lastDragTime;
    
    if (dist > 10 && timeDiff > 0) {
        const speed = dist / timeDiff;
        const count = Math.floor(speed * swipePlacementSpeed);
        
        for (let i = 0; i < count; i++) {
            const ratio = (i + 1) / (count + 1);
            const px = lastDragX + dx * ratio;
            const py = lastDragY + dy * ratio;
            
            if (!isInSafetyZone(px, py)) {
                placeMeteor(px, py);
            }
        }
    }
    
    lastDragX = x;
    lastDragY = y;
    lastDragTime = now;
}

function stopLongPress() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    if (longPressInterval) {
        clearInterval(longPressInterval);
        longPressInterval = null;
    }
    if (isLongPressActive) {
        isLongPressActive = false;
        addLog('长按放置已停止', 'info');
    }
    setTimeout(() => {
        ignoreNextClick = false;
    }, 100);
}

function shouldIgnoreClick() {
    return ignoreNextClick;
}

// 处理单击（触摸或鼠标）
function handleTap(x, y) {
    if (config.cameraMoveEnabled) return; // 移动开启时忽略
    placeMeteor(x, y);
}

// 统一触摸事件处理
function handleTouchStart(e) {
    // 如果摄像机移动开启，让 CameraControls 处理
    if (config.cameraMoveEnabled) return;

    e.preventDefault(); // 阻止页面滚动

    const rect = state.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    startLongPress(x, y);
}

function handleTouchMove(e) {
    if (config.cameraMoveEnabled) return;
    e.preventDefault();

    if (!isLongPressActive) return;

    const rect = state.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setMousePosition(x, y);
    handleDrag(x, y);
}

function handleTouchEnd(e) {
    if (config.cameraMoveEnabled) return;
    e.preventDefault();

    if (!isLongPressActive) {
        // 如果没有触发长按，可能是单击
        const rect = state.canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        if (touch) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            handleTap(x, y);
        }
    }
    stopLongPress();
}

function handleTouchCancel(e) {
    if (config.cameraMoveEnabled) return;
    e.preventDefault();
    stopLongPress();
}

// 鼠标事件
function handleMouseDown(e) {
    if (config.cameraMoveEnabled) return;
    e.preventDefault();

    const rect = state.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    startLongPress(x, y);
}

function handleMouseMove(e) {
    if (config.cameraMoveEnabled) return;

    const rect = state.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition(x, y);

    if (isLongPressActive) {
        handleDrag(x, y);
    }
}

function handleMouseUp(e) {
    if (config.cameraMoveEnabled) return;
    e.preventDefault();

    if (!isLongPressActive) {
        // 单击
        const rect = state.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleTap(x, y);
    }
    stopLongPress();
}

function handleMouseLeave(e) {
    if (config.cameraMoveEnabled) return;
    stopLongPress();
}

// click 事件处理（用于鼠标，防止重复）
function handleClick(e) {
    if (config.cameraMoveEnabled) return;
    if (shouldIgnoreClick()) return;

    const rect = state.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleTap(x, y);
}

/**
 * 初始化输入模块
 * @param {HTMLCanvasElement} canvas 画布元素
 * @param {Function} onPlaceMeteor 放置流星的回调，接收 (x, y)
 */
function initInput(canvas, onPlaceMeteor) {
    if (!canvas) return;

    placeMeteorCallback = onPlaceMeteor;

    // 触摸事件
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    // 鼠标事件
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);

    addLog('输入模块初始化完成（单击/长按放置）', 'info');
}

function cleanupInput() {
    stopLongPress();
    // 移除事件监听由外部处理
}

module.exports = {
    getMousePosition,
    setMousePosition,
    initInput,
    cleanupInput,
    updateInputConfig,
    isInSafetyZone,
    shouldIgnoreClick,
};
