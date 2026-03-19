// code/JS/utils/errorHandler.js

const { copyToClipboard } = require('./helpers.js');

// 错误日志存储
const errorLogs = [];
const MAX_ERROR_LOGS = 50;

/**
 * 添加错误到内部日志
 * @param {Error} error 错误对象
 * @param {string} context 错误上下文
 */
function logError(error, context = '') {
    const errorEntry = {
        timestamp: new Date().toISOString(),
        message: error?.message || error?.toString() || '未知错误',
        stack: error?.stack || '',
        context: context
    };
    
    errorLogs.unshift(errorEntry);
    if (errorLogs.length > MAX_ERROR_LOGS) {
        errorLogs.pop();
    }
    
    // 同时输出到控制台
    console.error(`[${errorEntry.timestamp}] ${context}:`, error);
}

/**
 * 显示错误模态框
 * @param {Error|string} error 错误对象或错误信息
 * @param {string} errorInfo 附加错误信息
 */
function showCriticalError(error, errorInfo = '') {
    try {
        // 转换错误对象
        const errorObj = typeof error === 'string' ? new Error(error) : error;
        
        // 记录错误
        logError(errorObj, errorInfo);
        
        console.error('模块错误:', errorObj, errorInfo);
        
        // 获取错误模态框元素
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        
        if (!errorModal || !errorMessage) {
            console.error('错误模态框元素不存在');
            return;
        }

        // 构建错误信息文本
        let errorText = `=== 黑洞模拟器错误 ===\n\n`;
        errorText += `时间: ${new Date().toLocaleString()}\n`;
        errorText += `错误类型: ${errorObj.name || 'Unknown'}\n`;
        errorText += `错误信息: ${errorObj.message || errorObj.toString()}\n\n`;
        
        if (errorObj.stack) {
            errorText += `堆栈追踪:\n${errorObj.stack}\n\n`;
        }
        
        if (errorInfo) {
            errorText += `附加信息:\n${errorInfo}\n\n`;
        }
        
        errorText += `浏览器: ${navigator.userAgent}\n`;
        errorText += `页面URL: ${window.location.href}\n`;

        // 显示错误信息
        errorMessage.textContent = errorText;
        errorModal.style.display = 'flex';
        
        // 触发自定义事件，通知其他模块停止动画等
        window.dispatchEvent(new CustomEvent('criticalerror', { 
            detail: { error: errorObj, info: errorInfo } 
        }));
        
    } catch (e) {
        console.error('显示错误时出错:', e);
    }
}

/**
 * 初始化模块错误处理
 */
function initModuleErrorHandlers() {
    console.log('模块错误处理已初始化');
    
    // 捕获模块内的未处理错误
    window.addEventListener('error', function(event) {
        // 避免重复处理已经在核心错误中捕获的错误
        if (event.defaultPrevented) return;
        
        showCriticalError(
            event.error || new Error(event.message),
            `模块错误 - 文件: ${event.filename}, 行: ${event.lineno}, 列: ${event.colno}`
        );
    });
    
    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', function(event) {
        if (event.defaultPrevented) return;
        
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        showCriticalError(error, '模块未处理的Promise拒绝');
    });
}

/**
 * 获取错误日志
 * @returns {Array} 错误日志数组
 */
function getErrorLogs() {
    return [...errorLogs];
}

/**
 * 清除错误日志
 */
function clearErrorLogs() {
    errorLogs.length = 0;
    console.log('错误日志已清除');
}

module.exports = {
    showCriticalError,
    initModuleErrorHandlers,
    getErrorLogs,
    clearErrorLogs,
    logError
};
