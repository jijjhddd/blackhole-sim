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
    if (isInSafetyZone(x, y)) {
        addLog('长按位置在安全区内', 'warning');
        return false;
    }
    
    const meteor = new Meteor(true, x, y);
    state.meteors.push(meteor);
    addLog(`长按放置流星 #${meteor.listId}`, 'info');
    return true;
}

function startLongPress(x, y) {
    // 如果摄像机移动启用或观察模式开启，禁用长按放置
    if (config.cameraMoveEnabled || window.observationMode) return;
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
            if (isLongPressActive && config.longPressAddMeteors) {
                placeMeteor(lastDragX, lastDragY);
            }
        }, longPressIntervalTime);
        
    }, longPressDelay);
}

function handleDrag(x, y) {
    if (!isLongPressActive || !config.longPressAddMeteors) return;
    
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
                const meteor = new Meteor(true, px, py);
                state.meteors.push(meteor);
                addLog(`滑动放置流星 #${meteor.listId}`, 'debug');
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

function initInput(canvas) {
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', (e) => {
        // 如果摄像机移动启用或观察模式开启，禁用长按放置
        if (config.cameraMoveEnabled || window.observationMode) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        startLongPress(x, y);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePosition(x, y);
        // 只有长按激活时才处理拖动放置，且不受摄像机状态影响（因为长按本已禁用）
        if (isLongPressActive) {
            handleDrag(x, y);
        }
    });
    
    canvas.addEventListener('mouseup', stopLongPress);
    canvas.addEventListener('mouseleave', stopLongPress);
    
    canvas.addEventListener('touchstart', (e) => {
        if (config.cameraMoveEnabled || window.observationMode) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        startLongPress(x, y);
    }, { passive: true });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!isLongPressActive) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setMousePosition(x, y);
        handleDrag(x, y);
    }, { passive: true });
    
    canvas.addEventListener('touchend', stopLongPress);
    canvas.addEventListener('touchcancel', stopLongPress);
    
    addLog('输入模块初始化完成（长按/滑动放置）', 'info');
}

function cleanupInput() {
    stopLongPress();
}

module.exports = {
    getMousePosition,
    setMousePosition,
    initInput,
    cleanupInput,
    updateInputConfig,
    isInSafetyZone,
    shouldIgnoreClick
};
