// code/JS/utils/logger.js

const config = require('../config.js');

const logs = [];
const maxLogs = 100;
let currentLogFilter = 'all';

/**
 * 初始化日志系统
 */
function initLogger() {
    console.log('日志系统初始化');
    updateLogDisplay();
}

/**
 * 添加日志
 * @param {string} message 日志消息
 * @param {string} type 日志类型：'error', 'warning', 'info', 'debug'
 */
function addLog(message, type = 'info') {
    // 根据类型和配置决定是否记录
    if ((type === 'error' && !config.logErrors) ||
        (type === 'warning' && !config.logWarnings) ||
        (type === 'info' && !config.logInfo) ||
        (type === 'debug' && !config.logDebug)) {
        return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        message,
        type,
        id: Date.now() + Math.random(),
        realTimestamp: Date.now()
    };
    logs.unshift(logEntry);
    if (logs.length > maxLogs) logs.pop();

    // 更新 UI
    updateLogDisplay();

    // 发送到后端服务器（异步，不等待）
    fetch('/api/jslog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
        // 静默失败，不影响主流程
    }).catch(() => {});

    // 同时输出到控制台
    const consoleMsg = `[${timestamp}] ${message}`;
    if (type === 'error') console.error(consoleMsg);
    else if (type === 'warning') console.warn(consoleMsg);
    else if (type === 'debug') console.debug(consoleMsg);
    else console.log(consoleMsg);
}

/**
 * 更新日志显示
 */
function updateLogDisplay() {
    const logContainer = document.getElementById('logContainer');
    const emptyMessage = document.getElementById('logEmptyMessage');
    if (!logContainer || !emptyMessage) return;

    // 更新计数
    updateLogCounts();

    // 根据筛选条件过滤日志
    let filteredLogs = logs;
    if (currentLogFilter !== 'all') {
        filteredLogs = logs.filter(log => log.type === currentLogFilter);
    }

    if (filteredLogs.length === 0) {
        // 显示空状态
        logContainer.style.display = 'none';
        emptyMessage.style.display = 'block';
        if (currentLogFilter === 'all') {
            emptyMessage.innerHTML = '<i class="fas fa-file-alt"></i><p>当前没有日志记录</p>';
        } else {
            emptyMessage.innerHTML = '<i class="fas fa-filter"></i><p>当前筛选条件没有匹配的日志</p>';
        }
    } else {
        // 有日志，清空容器并重新渲染
        logContainer.style.display = 'block';
        emptyMessage.style.display = 'none';
        logContainer.innerHTML = '';

        filteredLogs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${log.type}`;
            entry.innerHTML = `
                <span class="log-timestamp">[${log.timestamp}]</span>
                <span class="log-entry-content">${log.message}</span>
                <button class="log-entry-copy" data-log="${log.message}"><i class="fas fa-copy"></i> 复制</button>
            `;
            logContainer.appendChild(entry);
        });

        // 为每个复制按钮绑定事件
        document.querySelectorAll('.log-entry-copy').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const logMsg = this.getAttribute('data-log');
                copyToClipboard(logMsg);
                addLog('已复制单条日志', 'info');
            });
        });
    }
}

/**
 * 更新各类型日志的计数显示
 */
function updateLogCounts() {
    const allCount = document.getElementById('logCountAll');
    const errorCount = document.getElementById('logCountError');
    const warningCount = document.getElementById('logCountWarning');
    const infoCount = document.getElementById('logCountInfo');
    const debugCount = document.getElementById('logCountDebug');
    
    if (allCount) allCount.textContent = logs.length;
    if (errorCount) errorCount.textContent = logs.filter(l => l.type === 'error').length;
    if (warningCount) warningCount.textContent = logs.filter(l => l.type === 'warning').length;
    if (infoCount) infoCount.textContent = logs.filter(l => l.type === 'info').length;
    if (debugCount) debugCount.textContent = logs.filter(l => l.type === 'debug').length;
}

/**
 * 设置日志筛选类型
 * @param {string} filterType 'all', 'error', 'warning', 'info', 'debug'
 */
function setLogFilter(filterType) {
    currentLogFilter = filterType;
    updateLogDisplay();
    addLog(`日志筛选: ${filterType}`, 'info');
}

/**
 * 复制文本到剪贴板
 * @param {string} text 
 */
function copyToClipboard(text) {
    try {
        navigator.clipboard.writeText(text).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        });
    } catch (e) {
        console.error('复制失败:', e);
    }
}

/**
 * 复制所有日志到剪贴板
 */
function copyAllLogs() {
    const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
    copyToClipboard(text);
    addLog('已复制全部日志', 'info');
}

/**
 * 导出日志为文本文件
 */
function exportLogs() {
    const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `黑洞日志_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('日志已导出', 'info');
}

/**
 * 清空所有日志
 */
function clearLogs() {
    logs.length = 0;
    updateLogDisplay();
    addLog('日志已清除', 'info');
}

// 导出所有函数
module.exports = {
    addLog,
    logs,
    currentLogFilter,
    updateLogDisplay,
    setLogFilter,
    copyAllLogs,
    exportLogs,
    clearLogs,
    initLogger
};
