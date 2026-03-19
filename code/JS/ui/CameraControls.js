// code/JS/ui/CameraControls.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');

const MOVE_SPEED = 10;
const ZOOM_SPEED = 0.1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5.0;

let camera = null;
let activeKeys = new Set();
let isDragging = false;
let lastDragX = 0, lastDragY = 0;
let scale = 1.0;
let initialPinchDistance = null;
let initialPinchScale = 1.0;

function initCameraControls(cameraInstance) {
    camera = cameraInstance;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = state.canvas;
    if (canvas) {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);
        
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        
        canvas.addEventListener('wheel', handleWheel, { passive: false });
    }

    addLog('摄像机控制初始化完成', 'info');
}

function cleanupCameraControls() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    
    const canvas = state.canvas;
    if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseUp);
        canvas.removeEventListener('wheel', handleWheel);
    }
}

function updateCameraControls() {
    if (!camera) return;
    
    // 移除了 observationMode，仅由 cameraMoveEnabled 控制
    if (!config.cameraMoveEnabled) return;

    let dx = 0, dy = 0;
    if (activeKeys.has('KeyW')) dy -= MOVE_SPEED;
    if (activeKeys.has('KeyS')) dy += MOVE_SPEED;
    if (activeKeys.has('KeyA')) dx -= MOVE_SPEED;
    if (activeKeys.has('KeyD')) dx += MOVE_SPEED;
    if (dx !== 0 || dy !== 0) {
        camera.moveBy(dx, dy);
    }
}

function handleKeyDown(e) {
    const key = e.code;
    if (key === 'KeyW' || key === 'KeyA' || key === 'KeyS' || key === 'KeyD') {
        e.preventDefault();
        activeKeys.add(key);
    }
}

function handleKeyUp(e) {
    const key = e.code;
    if (key === 'KeyW' || key === 'KeyA' || key === 'KeyS' || key === 'KeyD') {
        e.preventDefault();
        activeKeys.delete(key);
    }
}

// 触摸处理
function handleTouchStart(e) {
    if (!config.cameraMoveEnabled) return;  // 仅由配置控制
    e.preventDefault();

    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = state.canvas.getBoundingClientRect();
        lastDragX = touch.clientX - rect.left;
        lastDragY = touch.clientY - rect.top;
        isDragging = true;
    } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialPinchScale = camera ? camera.scale : 1.0;
        isDragging = false;
    }
}

function handleTouchMove(e) {
    if (!config.cameraMoveEnabled) return;
    e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const rect = state.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const dx = lastDragX - x;
        const dy = lastDragY - y;
        camera.moveBy(dx, dy);
        
        lastDragX = x;
        lastDragY = y;
    } else if (e.touches.length === 2 && initialPinchDistance !== null) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        const currentDistance = Math.hypot(dx, dy);
        const scaleFactor = currentDistance / initialPinchDistance;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialPinchScale * scaleFactor));
        camera.setScale(newScale);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    isDragging = false;
    initialPinchDistance = null;
}

// 鼠标拖动（仅当 cameraMoveEnabled 为 true 时）
function handleMouseDown(e) {
    if (!config.cameraMoveEnabled) return;
    
    e.preventDefault();
    const rect = state.canvas.getBoundingClientRect();
    lastDragX = e.clientX - rect.left;
    lastDragY = e.clientY - rect.top;
    isDragging = true;
}

function handleMouseMove(e) {
    if (!isDragging) return;
    if (!config.cameraMoveEnabled) return;
    
    e.preventDefault();
    const rect = state.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = lastDragX - x;
    const dy = lastDragY - y;
    camera.moveBy(dx, dy);
    
    lastDragX = x;
    lastDragY = y;
}

function handleMouseUp(e) {
    if (!isDragging) return;
    e.preventDefault();
    isDragging = false;
}

// 滚轮缩放（仅当 cameraMoveEnabled 为 true 时）
function handleWheel(e) {
    if (!config.cameraMoveEnabled) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    if (camera) camera.setScale(scale);
    addLog(`缩放: ${scale.toFixed(2)}x`, 'debug');
}

function getScale() {
    return scale;
}

function setScale(newScale) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    if (camera) camera.setScale(scale);
}

function isDraggingActive() {
    return isDragging;
}

module.exports = {
    initCameraControls,
    cleanupCameraControls,
    updateCameraControls,
    getScale,
    setScale,
    isDraggingActive,
};
// 触摸处理（包含单指拖动和双指缩放）
function handleTouchStart(e) {
    if (!config.cameraMoveEnabled && !window.observationMode) return;
    e.preventDefault();

    if (e.touches.length === 1) {
        // 单指拖动
        const touch = e.touches[0];
        const rect = state.canvas.getBoundingClientRect();
        lastDragX = touch.clientX - rect.left;
        lastDragY = touch.clientY - rect.top;
        isDragging = true;
    } else if (e.touches.length === 2) {
        // 双指缩放准备
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialPinchScale = camera ? camera.scale : 1.0;
        isDragging = false; // 停止拖动模式
    }
}

function handleTouchMove(e) {
    if (!config.cameraMoveEnabled && !window.observationMode) return;
    e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
        // 单指拖动
        const touch = e.touches[0];
        const rect = state.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const dx = lastDragX - x;
        const dy = lastDragY - y;
        camera.moveBy(dx, dy);
        
        lastDragX = x;
        lastDragY = y;
    } else if (e.touches.length === 2 && initialPinchDistance !== null) {
        // 双指缩放
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        const currentDistance = Math.hypot(dx, dy);
        const scaleFactor = currentDistance / initialPinchDistance;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialPinchScale * scaleFactor));
        camera.setScale(newScale);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    isDragging = false;
    initialPinchDistance = null;
}

// 鼠标拖动（仅在观察模式启用）
function handleMouseDown(e) {
    if (!window.observationMode) return;
    if (!config.cameraMoveEnabled && !window.observationMode) return;
    
    e.preventDefault();
    const rect = state.canvas.getBoundingClientRect();
    lastDragX = e.clientX - rect.left;
    lastDragY = e.clientY - rect.top;
    isDragging = true; // 标记正在拖动
}

function handleMouseMove(e) {
    if (!isDragging) return;
    if (!window.observationMode) return;
    if (!config.cameraMoveEnabled && !window.observationMode) return;
    
    e.preventDefault();
    const rect = state.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = lastDragX - x;
    const dy = lastDragY - y;
    camera.moveBy(dx, dy);
    
    lastDragX = x;
    lastDragY = y;
}

function handleMouseUp(e) {
    if (!isDragging) return;
    e.preventDefault();
    isDragging = false;
}

// 滚轮缩放
function handleWheel(e) {
    if (!config.cameraMoveEnabled && !window.observationMode) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    if (camera) camera.setScale(scale);
    addLog(`缩放: ${scale.toFixed(2)}x`, 'debug');
}

function getScale() {
    return scale;
}

function setScale(newScale) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    if (camera) camera.setScale(scale);
}

// 新增导出函数：判断当前是否正在拖动
function isDraggingActive() {
    return isDragging;
}

module.exports = {
    initCameraControls,
    cleanupCameraControls,
    updateCameraControls,
    getScale,
    setScale,
    isDraggingActive, // 导出拖动状态
};
