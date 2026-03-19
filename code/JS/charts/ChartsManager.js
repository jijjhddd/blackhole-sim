// code/JS/charts/ChartsManager.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');
const { meteorList } = require('../data/MeteorDataCore.js');

// ==================== 图表实例变量 ====================
let meteorCountChart = null;
let consumptionRateChart = null;
let meteorSpeedChart = null;
let survivalTimeChart = null;
let dustCountChart = null;
let logTypeChart = null;
let logTimeChart = null;
let fpsChart = null;
let memoryChart = null;
let frameTimeChart = null;

// ==================== 全局数据存储 ====================
const chartData = {
    game: {
        meteorCounts: [],
        consumptionRates: [],
        meteorSpeeds: [],
        survivalTimes: [],
        dustCounts: [],
        timestamps: []
    },
    logs: {
        errorCounts: [],
        warningCounts: [],
        infoCounts: [],
        debugCounts: [],
        totalCounts: [],
        timestamps: []
    },
    performance: {
        fpsValues: [],
        memoryValues: [],
        frameTimes: [],
        timestamps: []
    }
};

// 性能数据缓存
let currentFps = 0;
let currentMemory = 0;
let currentFrameTime = 0;

// 日志数据引用（从 logger 导入）
let logs = [];
try {
    const logger = require('../utils/logger.js');
    logs = logger.logs;
} catch (e) {
    console.warn('无法导入日志模块', e);
}

// ==================== 备用 CDN 列表 ====================
const CHART_CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
    'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.min.js'
];

// 加载状态
let chartLoadingPromise = null;

// ==================== 动态加载 Chart.js（并行加载）====================
function loadChartJS() {
    if (chartLoadingPromise) return chartLoadingPromise;

    if (typeof Chart !== 'undefined') {
        chartLoadingPromise = Promise.resolve();
        return chartLoadingPromise;
    }

    addLog('Chart.js 未加载，正在尝试并行加载多个 CDN...', 'warning');

    chartLoadingPromise = new Promise((resolve, reject) => {
        let remaining = CHART_CDN_URLS.length;
        let anySuccess = false;

        CHART_CDN_URLS.forEach(url => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                if (typeof Chart !== 'undefined') {
                    if (!anySuccess) {
                        anySuccess = true;
                        addLog(`Chart.js 动态加载成功 (${url})`, 'info');
                        resolve();
                    }
                } else {
                    // 脚本加载了但 Chart 未定义，视为失败
                    remaining--;
                    if (remaining === 0 && !anySuccess) {
                        reject(new Error('所有 Chart.js CDN 均加载失败'));
                    }
                }
            };
            script.onerror = () => {
                remaining--;
                if (remaining === 0 && !anySuccess) {
                    reject(new Error('所有 Chart.js CDN 均加载失败'));
                }
            };
            document.head.appendChild(script);
        });

        // 可选：设置一个总超时，防止网络极慢导致永远不 resolve/reject
        setTimeout(() => {
            if (!anySuccess && typeof Chart === 'undefined') {
                reject(new Error('Chart.js 加载超时（10秒）'));
            }
        }, 10000); // 10秒超时
    });

    return chartLoadingPromise;
}

/**
 * 获取公共图表选项
 */
function getCommonOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: config.chartAnimations ? 500 : 0 },
        plugins: {
            legend: { labels: { color: '#a0c8ff' } }
        },
        scales: {
            x: {
                ticks: { color: '#88aaff' },
                grid: { color: 'rgba(100,150,255,0.1)' }
            },
            y: {
                ticks: { color: '#88aaff' },
                grid: { color: 'rgba(100,150,255,0.1)' },
                beginAtZero: true
            }
        }
    };
}

/**
 * 初始化所有图表
 */
async function initializeCharts() {
    try {
        await loadChartJS();
    } catch (e) {
        console.error('Chart.js 加载失败，图表功能不可用', e);
        // 在所有图表 canvas 上显示错误提示
        const canvases = [
            'meteorCountChart', 'consumptionRateChart', 'meteorSpeedChart',
            'survivalTimeChart', 'dustCountChart', 'logTypeChart', 'logTimeChart',
            'fpsChart', 'memoryChart', 'frameTimeChart'
        ];
        canvases.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.font = '14px Arial';
                ctx.fillStyle = '#ff5555';
                ctx.fillText('Chart.js 加载失败', 10, 30);
            }
        });
        return false;
    }

    try {
        // 流星数量图表
        meteorCountChart = new Chart(document.getElementById('meteorCountChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '流星数量',
                data: [],
                borderColor: '#4a9eff',
                backgroundColor: 'rgba(74,158,255,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        // 吞噬速率图表
        consumptionRateChart = new Chart(document.getElementById('consumptionRateChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '吞噬速率(个/秒)',
                data: [],
                borderColor: '#ff5555',
                backgroundColor: 'rgba(255,85,85,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        // 流星速度图表
        meteorSpeedChart = new Chart(document.getElementById('meteorSpeedChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '平均速度',
                data: [],
                borderColor: '#55ff55',
                backgroundColor: 'rgba(85,255,85,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        // 生存时间图表
        survivalTimeChart = new Chart(document.getElementById('survivalTimeChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '平均生存时间(秒)',
                data: [],
                borderColor: '#ffaa55',
                backgroundColor: 'rgba(255,170,85,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        // 尘埃数量图表
        dustCountChart = new Chart(document.getElementById('dustCountChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '尘埃粒子数量',
                data: [],
                borderColor: '#aaaaaa',
                backgroundColor: 'rgba(170,170,170,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        // 日志类型分布（饼图）
        logTypeChart = new Chart(document.getElementById('logTypeChart'), {
            type: 'pie',
            data: {
                labels: ['错误', '警告', '信息', '调试'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(255,85,85,0.8)',
                        'rgba(255,170,85,0.8)',
                        'rgba(85,170,255,0.8)',
                        'rgba(85,255,85,0.8)'
                    ],
                    borderColor: ['#ff5555', '#ffaa55', '#55aaff', '#55ff55'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: config.chartAnimations ? 500 : 0 },
                plugins: {
                    legend: { labels: { color: '#a0c8ff' } }
                }
            }
        });

        // 日志时间分布（柱状图）
        logTimeChart = new Chart(document.getElementById('logTimeChart'), {
            type: 'bar',
            data: {
                labels: ['最近1分钟', '1-5分钟', '5-15分钟', '15-30分钟', '30+分钟'],
                datasets: [{
                    label: '日志数量',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(74,158,255,0.7)',
                    borderColor: '#4a9eff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: config.chartAnimations ? 500 : 0 },
                plugins: {
                    legend: { labels: { color: '#a0c8ff' } }
                },
                scales: {
                    x: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' } },
                    y: { ticks: { color: '#88aaff' }, grid: { color: 'rgba(100,150,255,0.1)' }, beginAtZero: true }
                }
            }
        });

        // FPS图表
        fpsChart = new Chart(document.getElementById('fpsChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '帧率(FPS)',
                data: [],
                borderColor: '#8e2de2',
                backgroundColor: 'rgba(142,45,226,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        // 内存使用图表
        memoryChart = new Chart(document.getElementById('memoryChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '内存使用(MB)',
                data: [],
                borderColor: '#00b09b',
                backgroundColor: 'rgba(0,176,155,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        // 渲染延迟图表
        frameTimeChart = new Chart(document.getElementById('frameTimeChart'), {
            type: 'line',
            data: { labels: [], datasets: [{
                label: '渲染延迟(ms)',
                data: [],
                borderColor: '#ff8c00',
                backgroundColor: 'rgba(255,140,0,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }] },
            options: getCommonOptions()
        });

        addLog('图表初始化完成', 'info');
        return true;
    } catch (e) {
        console.error('图表初始化失败', e);
        addLog(`图表初始化失败: ${e.message}`, 'error');
        return false;
    }
}

function setCurrentFps(fps) { currentFps = fps; }
function setCurrentMemory(memory) { currentMemory = memory; }
function setCurrentFrameTime(frameTime) { currentFrameTime = frameTime; }

function collectGameData() {
    const now = Date.now();
    const startTime = require('../statistics.js').startTime;
    const elapsed = (now - startTime) / 1000;
    
    const consumedMeteors = require('../statistics.js').consumedMeteors || 0;
    const rate = elapsed > 0 ? (consumedMeteors / elapsed) * 60 : 0;
    
    const totalMeteorSpeed = require('../statistics.js').totalMeteorSpeed || 0;
    const meteorSpeedCount = require('../statistics.js').meteorSpeedCount || 0;
    const avgSp = meteorSpeedCount > 0 ? totalMeteorSpeed / meteorSpeedCount : 0;
    
    const totalSurvivalTime = require('../statistics.js').totalSurvivalTime || 0;
    const meteorSurvivalCount = require('../statistics.js').meteorSurvivalCount || 0;
    const avgSur = meteorSurvivalCount > 0 ? totalSurvivalTime / meteorSurvivalCount : 0;
    
    const timeLabel = elapsed < 60 ? `${elapsed.toFixed(0)}s` : `${(elapsed/60).toFixed(1)}m`;
    
    const d = chartData.game;
    d.meteorCounts.push(state.meteors.length);
    d.consumptionRates.push(rate);
    d.meteorSpeeds.push(avgSp);
    d.survivalTimes.push(avgSur);
    d.dustCounts.push(state.dustParticles.length);
    d.timestamps.push(timeLabel);
    
    if (d.meteorCounts.length > config.maxChartDataPoints) {
        const removeCount = d.meteorCounts.length - config.maxChartDataPoints;
        d.meteorCounts.splice(0, removeCount);
        d.consumptionRates.splice(0, removeCount);
        d.meteorSpeeds.splice(0, removeCount);
        d.survivalTimes.splice(0, removeCount);
        d.dustCounts.splice(0, removeCount);
        d.timestamps.splice(0, removeCount);
    }
}

function collectLogData() {
    const now = Date.now();
    const startTime = require('../statistics.js').startTime;
    
    const errorCount = logs.filter(l => l.type === 'error').length;
    const warningCount = logs.filter(l => l.type === 'warning').length;
    const infoCount = logs.filter(l => l.type === 'info').length;
    const debugCount = logs.filter(l => l.type === 'debug').length;
    
    const d = chartData.logs;
    d.errorCounts.push(errorCount);
    d.warningCounts.push(warningCount);
    d.infoCounts.push(infoCount);
    d.debugCounts.push(debugCount);
    d.totalCounts.push(logs.length);
    d.timestamps.push((now - startTime) / 60000); // 分钟
    
    if (d.errorCounts.length > config.maxChartDataPoints) {
        const removeCount = d.errorCounts.length - config.maxChartDataPoints;
        d.errorCounts.splice(0, removeCount);
        d.warningCounts.splice(0, removeCount);
        d.infoCounts.splice(0, removeCount);
        d.debugCounts.splice(0, removeCount);
        d.totalCounts.splice(0, removeCount);
        d.timestamps.splice(0, removeCount);
    }
    
    updateLogTimeDistribution();
}

function updateLogTimeDistribution() {
    if (!logTimeChart) return;
    
    const now = Date.now();
    const ranges = [
        { min: 0, max: 60000, count: 0 },
        { min: 60000, max: 300000, count: 0 },
        { min: 300000, max: 900000, count: 0 },
        { min: 900000, max: 1800000, count: 0 },
        { min: 1800000, max: Infinity, count: 0 }
    ];
    
    logs.forEach(l => {
        const age = now - l.realTimestamp;
        for (const r of ranges) {
            if (age >= r.min && age < r.max) {
                r.count++;
                break;
            }
        }
    });
    
    logTimeChart.data.datasets[0].data = ranges.map(r => r.count);
    logTimeChart.update(config.chartAnimations ? undefined : 'none');
}

function collectPerformanceData() {
    const startTime = require('../statistics.js').startTime;
    const elapsed = (Date.now() - startTime) / 1000;
    const timeLabel = elapsed < 60 ? `${elapsed.toFixed(0)}s` : `${(elapsed/60).toFixed(1)}m`;
    
    const d = chartData.performance;
    d.fpsValues.push(currentFps);
    d.memoryValues.push(currentMemory);
    d.frameTimes.push(currentFrameTime);
    d.timestamps.push(timeLabel);
    
    if (d.fpsValues.length > config.maxChartDataPoints) {
        const removeCount = d.fpsValues.length - config.maxChartDataPoints;
        d.fpsValues.splice(0, removeCount);
        d.memoryValues.splice(0, removeCount);
        d.frameTimes.splice(0, removeCount);
        d.timestamps.splice(0, removeCount);
    }
}

function updateAllCharts() {
    if (!meteorCountChart) return;
    
    try {
        collectGameData();
        collectLogData();
        collectPerformanceData();
        
        const g = chartData.game;
        const p = chartData.performance;
        const updateMode = config.chartAnimations ? undefined : 'none';
        
        if (meteorCountChart) {
            meteorCountChart.data.labels = g.timestamps;
            meteorCountChart.data.datasets[0].data = g.meteorCounts;
            meteorCountChart.update(updateMode);
        }
        
        if (consumptionRateChart) {
            consumptionRateChart.data.labels = g.timestamps;
            consumptionRateChart.data.datasets[0].data = g.consumptionRates;
            consumptionRateChart.update(updateMode);
        }
        
        if (meteorSpeedChart) {
            meteorSpeedChart.data.labels = g.timestamps;
            meteorSpeedChart.data.datasets[0].data = g.meteorSpeeds;
            meteorSpeedChart.update(updateMode);
        }
        
        if (survivalTimeChart) {
            survivalTimeChart.data.labels = g.timestamps;
            survivalTimeChart.data.datasets[0].data = g.survivalTimes;
            survivalTimeChart.update(updateMode);
        }
        
        if (dustCountChart) {
            dustCountChart.data.labels = g.timestamps;
            dustCountChart.data.datasets[0].data = g.dustCounts;
            dustCountChart.update(updateMode);
        }
        
        if (fpsChart) {
            fpsChart.data.labels = p.timestamps;
            fpsChart.data.datasets[0].data = p.fpsValues;
            fpsChart.update(updateMode);
        }
        
        if (memoryChart) {
            memoryChart.data.labels = p.timestamps;
            memoryChart.data.datasets[0].data = p.memoryValues;
            memoryChart.update(updateMode);
        }
        
        if (frameTimeChart) {
            frameTimeChart.data.labels = p.timestamps;
            frameTimeChart.data.datasets[0].data = p.frameTimes;
            frameTimeChart.update(updateMode);
        }
        
        if (logTypeChart) {
            const d = chartData.logs;
            const lastIndex = d.errorCounts.length - 1;
            if (lastIndex >= 0) {
                logTypeChart.data.datasets[0].data = [
                    d.errorCounts[lastIndex] || 0,
                    d.warningCounts[lastIndex] || 0,
                    d.infoCounts[lastIndex] || 0,
                    d.debugCounts[lastIndex] || 0
                ];
                logTypeChart.update(updateMode);
            }
        }
        
        const chartDataPoints = document.getElementById('chartDataPoints');
        if (chartDataPoints) {
            chartDataPoints.textContent = 
                g.meteorCounts.length + chartData.logs.errorCounts.length + p.fpsValues.length;
        }
        
    } catch (e) {
        console.error('更新图表失败', e);
        addLog(`更新图表失败: ${e.message}`, 'error');
    }
}

function clearAllChartData() {
    chartData.game = {
        meteorCounts: [], consumptionRates: [], meteorSpeeds: [],
        survivalTimes: [], dustCounts: [], timestamps: []
    };
    chartData.logs = {
        errorCounts: [], warningCounts: [], infoCounts: [],
        debugCounts: [], totalCounts: [], timestamps: []
    };
    chartData.performance = {
        fpsValues: [], memoryValues: [], frameTimes: [], timestamps: []
    };
    updateAllCharts();
    addLog('图表数据已清除', 'info');
}

function exportChartData() {
    const dataStr = JSON.stringify(chartData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `黑洞图表数据_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('图表数据已导出', 'info');
}

// 确保导出所有需要的函数
module.exports = {
    initializeCharts,
    updateAllCharts,
    clearAllChartData,
    exportChartData,
    setCurrentFps,
    setCurrentMemory,
    setCurrentFrameTime,
    loadChartJS   // 确保导出 loadChartJS
};
