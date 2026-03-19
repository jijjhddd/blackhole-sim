// code/JS/statistics.js

const state = require('./state.js');
const { addLog } = require('./utils/logger.js');

// ========== 统计变量 ==========
let consumedMeteors = 0;
let totalMeteorsCreated = 0;
let totalMeteorSpeed = 0;
let meteorSpeedCount = 0;
let totalSurvivalTime = 0;
let meteorSurvivalCount = 0;
let startTime = Date.now();

/**
 * 记录新流星创建
 * @param {number} initialSpeed 初始速度
 */
function incrementCreatedMeteor(initialSpeed) {
    totalMeteorsCreated++;
    totalMeteorSpeed += initialSpeed;
    meteorSpeedCount++;
}

/**
 * 记录流星被吞噬
 * @param {number} survivalTime 生存时间（秒）
 */
function incrementConsumedMeteor(survivalTime) {
    consumedMeteors++;
    totalSurvivalTime += survivalTime;
    meteorSurvivalCount++;
}

/**
 * 记录流星被移除（飞出屏幕）
 * @param {number} survivalTime 生存时间（秒）
 */
function incrementRemovedMeteor(survivalTime) {
    totalSurvivalTime += survivalTime;
    meteorSurvivalCount++;
}

/**
 * 记录流星被摧毁
 * @param {number} survivalTime 生存时间（秒）
 */
function incrementDestroyedMeteor(survivalTime) {
    totalSurvivalTime += survivalTime;
    meteorSurvivalCount++;
}

/**
 * 更新统计显示
 */
function updateStats() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const rate = elapsed > 0 ? (consumedMeteors / elapsed).toFixed(2) : "0.00";
    const avgSpeed = meteorSpeedCount > 0 ? (totalMeteorSpeed / meteorSpeedCount).toFixed(1) : "0.0";
    const avgSurvival = meteorSurvivalCount > 0 ? (totalSurvivalTime / meteorSurvivalCount).toFixed(1) : "0.0";

    // 流星统计
    const meteorsCountEl = document.getElementById('meteorsCount');
    if (meteorsCountEl) meteorsCountEl.textContent = state.meteors.length;
    
    const consumedCountEl = document.getElementById('consumedCount');
    if (consumedCountEl) consumedCountEl.textContent = consumedMeteors;
    
    const totalMeteorsEl = document.getElementById('totalMeteors');
    if (totalMeteorsEl) totalMeteorsEl.textContent = totalMeteorsCreated;
    
    const avgSpeedEl = document.getElementById('avgMeteorSpeed');
    if (avgSpeedEl) avgSpeedEl.textContent = avgSpeed;
    
    const avgSurvivalEl = document.getElementById('avgSurvivalTime');
    if (avgSurvivalEl) avgSurvivalEl.textContent = avgSurvival;
    
    const timeElapsedEl = document.getElementById('timeElapsed');
    if (timeElapsedEl) timeElapsedEl.textContent = elapsed;
    
    const consumptionRateEl = document.getElementById('consumptionRate');
    if (consumptionRateEl) consumptionRateEl.textContent = rate;
    
    // 尘埃统计
    const dustCountEl = document.getElementById('dustCount');
    if (dustCountEl) dustCountEl.textContent = state.dustParticles.length;
}

/**
 * 重置统计
 */
function resetStats() {
    consumedMeteors = 0;
    totalMeteorsCreated = 0;
    totalMeteorSpeed = 0;
    meteorSpeedCount = 0;
    totalSurvivalTime = 0;
    meteorSurvivalCount = 0;
    startTime = Date.now();
    updateStats();
    addLog('统计已重置', 'info');
}

/**
 * 设置开始时间
 * @param {number} time 
 */
function setStartTime(time) {
    startTime = time;
}

/**
 * 导出统计
 */
function exportStats() {
    const stats = {
        时间: new Date().toLocaleString(),
        运行秒: Math.floor((Date.now() - startTime) / 1000),
        当前流星: state.meteors.length,
        已吞噬: consumedMeteors,
        总生成: totalMeteorsCreated,
        平均速度: meteorSpeedCount > 0 ? (totalMeteorSpeed / meteorSpeedCount).toFixed(1) : '0.0',
        平均生存: meteorSurvivalCount > 0 ? (totalSurvivalTime / meteorSurvivalCount).toFixed(1) : '0.0',
        尘埃粒子: state.dustParticles.length
    };

    const dataStr = JSON.stringify(stats, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `黑洞统计_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('统计已导出', 'info');
}

// 导出所有变量和函数
module.exports = {
    consumedMeteors,
    totalMeteorsCreated,
    totalMeteorSpeed,
    meteorSpeedCount,
    totalSurvivalTime,
    meteorSurvivalCount,
    startTime,
    incrementCreatedMeteor,
    incrementConsumedMeteor,
    incrementRemovedMeteor,
    incrementDestroyedMeteor,
    updateStats,
    resetStats,
    setStartTime,
    exportStats
};
