// code/JS/config.js

// 配置对象
const config = {
    // 黑洞参数
    blackHoleStrength: 180000,
    blackHoleSize: 30,
    gravityFalloff: 1.6,
    minGravityDistance: 15,
    safetyZoneRadius: 150,

    // 流星参数
    meteorSpeedBase: 1.5,
    meteorCount: 15,
    meteorMaxSize: 11,
    boundaryMode: 'remove',
    autoCreateMeteors: false,
    clickPlacementEnabled: true,
    clickCooldownEnabled: false,
    clickCooldownTime: 1.0,

    // 长按/滑动
    longPressAddMeteors: false,
    longPressDelay: 500,
    longPressIntervalTime: 100,
    swipePlacementSpeed: 5,

    // 视觉效果
    showTrails: true,
    trailLength: 50,
    showSafetyZone: false,
    showEventHorizon: false,
    showGravityGradient: false,
    showGravitationalLens: true,
    lensStrength: 0.3,
    lensRadius: 200,
    showMeteorLabels: true,
    sliderProtectionEnabled: true,

    // 尘埃参数
    maxDustParticles: 2000,

    // 图表参数
    maxChartDataPoints: 300,
    chartUpdateInterval: 1000,
    autoUpdateCharts: true,
    chartAnimations: false,

    // 日志开关
    logErrors: true,
    logWarnings: true,
    logInfo: true,
    logDebug: false,

    // 时间缩放
    timeScale: 1.0,

    // 摄像机移动开关（非观察模式下是否允许移动）
    cameraMoveEnabled: true,

    // 监听器列表
    _listeners: {}
};

/**
 * 添加配置变更监听
 * @param {string} key 配置键名
 * @param {Function} callback 回调函数
 */
config.onChange = function(key, callback) {
    if (!this._listeners[key]) {
        this._listeners[key] = [];
    }
    this._listeners[key].push(callback);
};

/**
 * 触发配置变更
 * @param {string} key 配置键名
 * @param {any} value 新值
 */
config._trigger = function(key, value) {
    const listeners = this._listeners[key] || [];
    listeners.forEach(callback => callback(value));
};

// 使用 Proxy 拦截属性设置，触发监听器
const configProxy = new Proxy(config, {
    set(target, property, value) {
        const oldValue = target[property];
        target[property] = value;

        // 触发监听器
        if (property !== '_listeners' && !property.startsWith('_')) {
            target._trigger(property, value);

            // 特殊处理：某些配置变更需要立即生效
            if (property === 'showTrails') {
                // 将在主循环中处理
            } else if (property === 'trailLength') {
                if (window.simulator) {
                    window.simulator.updateAllTrailsLength(value);
                }
            } else if (property === 'autoCreateMeteors') {
                if (window.simulator) {
                    if (value) {
                        window.simulator.startAutoMeteorCreation();
                    } else {
                        window.simulator.stopAutoMeteorCreation();
                    }
                }
            }
        }
        return true;
    }
});

