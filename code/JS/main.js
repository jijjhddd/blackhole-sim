// code/JS/main.js

// 引入 CSS
require('../CSS/style.css');
require('../CSS/panel.css');

// 引入核心模块
const state = require('./state.js');
const config = require('./config.js');

// 分别导入 logger 函数
const logger = require('./utils/logger.js');
const addLog = logger.addLog;
const initLogger = logger.initLogger;

const { initModuleErrorHandlers, showCriticalError } = require('./utils/errorHandler.js');
const { initUI, updateBlackHoleProperties, togglePanel, setObservationMode, applyCanvasSize } = require('./ui/UIManager.js');
const { updateStats, setStartTime, incrementCreatedMeteor, resetStats, exportStats } = require('./statistics.js');
const { setMousePosition, updateMeteorLabel, showMeteorInfo, hideMeteorLabel } = require('./ui/Labels.js');

// 引入 MeteorList 模块
const { initMeteorList, updateMeteorListDisplay } = require('./ui/MeteorList.js');

// 引入 MeteorDetail 模块
const { initMeteorDetailButtons, updateCurrentMeteorDetail } = require('./ui/MeteorDetail.js');

// 引入输入模块（已整合触摸放置）
const { initInput, cleanupInput, setMousePosition: setInputMousePosition, shouldIgnoreClick } = require('./utils/input.js');

// 引入图表模块
const chartManager = require('./charts/ChartsManager.js');
const {
    initializeCharts,
    updateAllCharts,
    clearAllChartData,
    exportChartData,
    setCurrentFps,
    setCurrentMemory,
    setCurrentFrameTime,
    loadChartJS
} = chartManager;

// 引入渲染模块
const Renderer = require('./ui/Renderer.js');

// 引入飘窗提示模块
const Toast = require('./ui/Toast.js');

// 引入摄像机模块
const Camera = require('./physics/Camera.js');
const { initCameraControls, cleanupCameraControls, updateCameraControls, getScale, setScale, isDraggingActive } = require('./ui/CameraControls.js');

// 立即开始预加载 Chart.js
if (typeof loadChartJS === 'function') {
    loadChartJS().catch(() => {});
} else {
    console.error('loadChartJS 不是函数', loadChartJS);
}

// 引入物理模块
const Meteor = require('./physics/Meteor.js');
const DustParticle = require('./physics/DustParticle.js');
const { physicsUpdate, destroyMeteor, detonateAllMeteors, updateEffects, drawEffects } = require('./physics/engine.js');

// 从数据核心模块导入
const meteorDataCore = require('./data/MeteorDataCore.js');
const { clearMeteorList, restoreMeteorToList } = meteorDataCore;

// 初始化模块错误处理
initModuleErrorHandlers();

// 初始化日志系统
if (typeof initLogger === 'function') {
    initLogger();
    console.log('日志系统初始化成功');
} else {
    console.error('initLogger 不是函数', typeof initLogger);
}

// 全局变量声明
window.state = state;
window.config = config;
window.addLog = addLog;
window.Toast = Toast;

// 进度更新辅助函数
function updateProgress(percent, message) {
    if (window.updateLoadingProgress) {
        window.updateLoadingProgress(percent, message);
    }
    if (window.addLoadingLog) {
        window.addLoadingLog(message);
    }
}

// 流星标签定位函数
function positionLabel(label, targetX, targetY) {
    label.classList.remove('below');
    label.style.left = targetX + 'px';
    label.style.top = targetY + 'px';

    const rect = label.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let left = targetX;
    let top = targetY - rect.height - 12;

    if (left + rect.width > winW - 10) {
        left = winW - rect.width - 10;
    }
    if (left < 10) {
        left = 10;
    }

    if (top < 10) {
        top = targetY + 20;
        label.classList.add('below');
    }

    label.style.left = left + 'px';
    label.style.top = top + 'px';
}

// 带摄像机的流星标签更新函数
function updateMeteorLabelWithCamera(camera) {
    const label = document.getElementById('meteorLabel');
    if (!label) return;

    const canvas = state.canvas;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    if (window.persistentMeteorId) {
        const meteor = state.meteors.find(m => m.listId === window.persistentMeteorId && !m.consumed);
        if (meteor) {
            const screenPos = camera ? camera.worldToScreen(meteor.x, meteor.y) : { x: meteor.x, y: meteor.y };
            const dist = Math.hypot(meteor.x - state.blackHole.x, meteor.y - state.blackHole.y).toFixed(1);
            const survival = ((Date.now() - meteor.createdAt) / 1000).toFixed(1);
            label.innerHTML = `
                <strong>流星 #${meteor.listId}</strong><br>
                位置: (${Math.round(meteor.x)}, ${Math.round(meteor.y)})<br>
                速度: ${Math.hypot(meteor.vx, meteor.vy).toFixed(2)}<br>
                质量: ${meteor.mass.toFixed(1)}<br>
                距离黑洞: ${dist}<br>
                生存: ${survival}秒
            `;
            label.style.display = 'block';
            positionLabel(label, canvasRect.left + screenPos.x, canvasRect.top + screenPos.y);
            return;
        } else {
            window.persistentMeteorId = null;
        }
    }

    if (config.showMeteorLabels) {
        let hovered = null;
        let minDist = Infinity;
        for (const m of state.meteors) {
            if (m.consumed) continue;
            const screenPos = camera ? camera.worldToScreen(m.x, m.y) : { x: m.x, y: m.y };
            const d = Math.hypot(window.mouseX - screenPos.x, window.mouseY - screenPos.y);
            if (d < m.radius * 3 && d < minDist) {
                minDist = d;
                hovered = m;
            }
        }
        if (hovered) {
            const dist = Math.hypot(hovered.x - state.blackHole.x, hovered.y - state.blackHole.y).toFixed(1);
            label.innerHTML = `
                <strong>流星 #${hovered.listId}</strong><br>
                速度: ${Math.hypot(hovered.vx, hovered.vy).toFixed(2)}<br>
                质量: ${hovered.mass.toFixed(1)}<br>
                距离: ${dist}
            `;
            label.style.display = 'block';
            const screenPos = camera ? camera.worldToScreen(hovered.x, hovered.y) : { x: hovered.x, y: hovered.y };
            positionLabel(label, canvasRect.left + screenPos.x, canvasRect.top + screenPos.y);
            return;
        }
    }

    label.style.display = 'none';
}

/**
 * 主应用类
 */
class BlackHoleSimulator {
    constructor() {
        this.animationId = null;
        this.lastAnimationTime = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameTimes = [];
        this.maxFrameTimeSamples = 60;
        this.isPaused = false;

        this.STARS_EXTRA = 200;
        this.starsArray = [];

        this.autoMeteorInterval = null;
        this.chartUpdateTimer = null;
        this.keyboardBound = false;

        this.physicsTimestep = 1000 / 60;
        this.accumulator = 0;

        // 摄像机
        this.camera = new Camera();
        window.camera = this.camera;

        // 绑定方法
        this.generateStars = this.generateStars.bind(this);
        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.animate = this.animate.bind(this);
        this.togglePause = this.togglePause.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.updatePhysics = this.updatePhysics.bind(this);
        this.updatePerformanceStats = this.updatePerformanceStats.bind(this);
        this.addMeteorAt = this.addMeteorAt.bind(this);
        this.clearAllMeteors = this.clearAllMeteors.bind(this);
        this.resetSimulation = this.resetSimulation.bind(this);
        this.startAutoMeteorCreation = this.startAutoMeteorCreation.bind(this);
        this.stopAutoMeteorCreation = this.stopAutoMeteorCreation.bind(this);
        this.updateAllTrailsLength = this.updateAllTrailsLength.bind(this);
        this.toggleDebugInfo = this.toggleDebugInfo.bind(this);
        this.updateDebugInfoContent = this.updateDebugInfoContent.bind(this);
        this.hideHints = this.hideHints.bind(this);

        // 存档相关
        this.saveState = this.saveState.bind(this);
        this.loadState = this.loadState.bind(this);
        this.getCurrentState = this.getCurrentState.bind(this);
        this.refreshSavesList = this.refreshSavesList.bind(this);
        this.deleteSave = this.deleteSave.bind(this);
        this.deleteAllSaves = this.deleteAllSaves.bind(this);
        this.copySave = this.copySave.bind(this);
        this.renameSave = this.renameSave.bind(this);

        // 摄像机相关
        this.followMeteor = this.followMeteor.bind(this);
        this.resetCamera = this.resetCamera.bind(this);

        setStartTime(Date.now());

        this.initCanvas();
        this.setupConfigListeners();
        this.start();
    }

    // 获取当前状态
    getCurrentState() {
        return {
            version: '3.0',
            timestamp: Date.now(),
            config: {
                blackHoleStrength: config.blackHoleStrength,
                blackHoleSize: config.blackHoleSize,
                gravityFalloff: config.gravityFalloff,
                minGravityDistance: config.minGravityDistance,
                safetyZoneRadius: config.safetyZoneRadius,
                meteorSpeedBase: config.meteorSpeedBase,
                meteorCount: config.meteorCount,
                meteorMaxSize: config.meteorMaxSize,
                boundaryMode: config.boundaryMode,
                autoCreateMeteors: config.autoCreateMeteors,
                clickPlacementEnabled: config.clickPlacementEnabled,
                clickCooldownEnabled: config.clickCooldownEnabled,
                clickCooldownTime: config.clickCooldownTime,
                longPressAddMeteors: config.longPressAddMeteors,
                longPressDelay: config.longPressDelay,
                longPressIntervalTime: config.longPressIntervalTime,
                swipePlacementSpeed: config.swipePlacementSpeed,
                showTrails: config.showTrails,
                trailLength: config.trailLength,
                showSafetyZone: config.showSafetyZone,
                showEventHorizon: config.showEventHorizon,
                showGravityGradient: config.showGravityGradient,
                showGravitationalLens: config.showGravitationalLens,
                lensStrength: config.lensStrength,
                lensRadius: config.lensRadius,
                showMeteorLabels: config.showMeteorLabels,
                sliderProtectionEnabled: config.sliderProtectionEnabled,
                maxDustParticles: config.maxDustParticles,
                maxChartDataPoints: config.maxChartDataPoints,
                chartUpdateInterval: config.chartUpdateInterval,
                autoUpdateCharts: config.autoUpdateCharts,
                chartAnimations: config.chartAnimations,
                logErrors: config.logErrors,
                logWarnings: config.logWarnings,
                logInfo: config.logInfo,
                logDebug: config.logDebug,
                timeScale: config.timeScale,
                cameraMoveEnabled: config.cameraMoveEnabled,
                adaptiveCanvas: config.adaptiveCanvas,
                canvasWidth: config.canvasWidth,
                canvasHeight: config.canvasHeight
            },
            meteors: state.meteors.map(m => ({
                x: m.x, y: m.y,
                vx: m.vx, vy: m.vy,
                mass: m.mass,
                radius: m.radius,
                color: m.color,
                manual: m.manual,
                createdAt: m.createdAt,
                listId: m.listId,
                trail: m.trail.slice()
            })),
            dustParticles: state.dustParticles.map(d => ({
                x: d.x, y: d.y,
                vx: d.vx, vy: d.vy,
                mass: d.mass,
                radius: d.radius,
                color: d.color,
                protectedUntilFrame: d.protectedUntilFrame
            })),
            stats: {
                consumedMeteors: require('./statistics.js').consumedMeteors,
                totalMeteorsCreated: require('./statistics.js').totalMeteorsCreated,
                totalMeteorSpeed: require('./statistics.js').totalMeteorSpeed,
                meteorSpeedCount: require('./statistics.js').meteorSpeedCount,
                totalSurvivalTime: require('./statistics.js').totalSurvivalTime,
                meteorSurvivalCount: require('./statistics.js').meteorSurvivalCount,
                startTime: require('./statistics.js').startTime
            },
            meteorList: meteorDataCore.meteorList.map(info => ({
                ...info,
                meteorObject: undefined
            })),
            camera: {
                offsetX: this.camera.offsetX,
                offsetY: this.camera.offsetY,
                targetOffsetX: this.camera.targetOffsetX,
                targetOffsetY: this.camera.targetOffsetY,
                scale: this.camera.scale
            }
        };
    }

    // 保存状态
    async saveState(name = null) {
        try {
            const stateData = this.getCurrentState();
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: stateData, name })
            });
            const result = await response.json();
            if (result.success) {
                addLog(`状态已保存: ${result.name || '未命名'}`, 'info');
                Toast.showSuccess(`状态已保存: ${result.name || '未命名'}`);
                this.refreshSavesList();
            } else {
                addLog(`保存失败: ${result.error}`, 'error');
                Toast.showError(`保存失败: ${result.error}`);
            }
            return result;
        } catch (e) {
            addLog(`保存请求失败: ${e.message}`, 'error');
            Toast.showError(`保存请求失败: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    // 加载状态
    async loadState(name) {
        if (!name) {
            addLog('请选择要加载的存档', 'warning');
            Toast.showWarning('请选择要加载的存档');
            return;
        }
        try {
            const response = await fetch(`/api/load?name=${encodeURIComponent(name)}`);
            const result = await response.json();
            if (!result.success) {
                addLog(`加载失败: ${result.error}`, 'error');
                Toast.showError(`加载失败: ${result.error}`);
                return;
            }

            const data = result.data;

            if (data.config) {
                Object.assign(config, data.config);
                if (typeof updateBlackHoleProperties === 'function') {
                    updateBlackHoleProperties();
                }
            }

            state.meteors = [];
            state.dustParticles = [];
            meteorDataCore.clearMeteorList();

            if (data.meteors && data.meteorList) {
                const meteorsMap = new Map();
                data.meteors.forEach(mData => {
                    const meteor = new Meteor(mData.manual, mData.x, mData.y);
                    meteor.vx = mData.vx;
                    meteor.vy = mData.vy;
                    meteor.mass = mData.mass;
                    meteor.radius = mData.radius;
                    meteor.color = mData.color;
                    meteor.createdAt = mData.createdAt;
                    meteor.listId = mData.listId;
                    meteor.trail = mData.trail || [];
                    state.meteors.push(meteor);
                    meteorsMap.set(mData.listId, meteor);
                });

                data.meteorList.forEach(info => {
                    const meteor = meteorsMap.get(info.id);
                    if (meteor) {
                        restoreMeteorToList(meteor, info);
                    }
                });
            }

            if (data.dustParticles) {
                data.dustParticles.forEach(dData => {
                    const dust = new DustParticle(dData.x, dData.y, dData.vx, dData.vy, dData.mass);
                    dust.radius = dData.radius;
                    dust.color = dData.color;
                    dust.protectedUntilFrame = dData.protectedUntilFrame || 0;
                    state.dustParticles.push(dust);
                });
            }

            if (data.stats) {
                const stats = require('./statistics.js');
                stats.consumedMeteors = data.stats.consumedMeteors || 0;
                stats.totalMeteorsCreated = data.stats.totalMeteorsCreated || 0;
                stats.totalMeteorSpeed = data.stats.totalMeteorSpeed || 0;
                stats.meteorSpeedCount = data.stats.meteorSpeedCount || 0;
                stats.totalSurvivalTime = data.stats.totalSurvivalTime || 0;
                stats.meteorSurvivalCount = data.stats.meteorSurvivalCount || 0;
                stats.setStartTime(data.stats.startTime || Date.now());
            }

            if (data.camera) {
                this.camera.setOffset(data.camera.offsetX || 0, data.camera.offsetY || 0);
                if (data.camera.scale) this.camera.setScale(data.camera.scale);
            }

            updateMeteorListDisplay();
            updateStats();

            addLog(`状态已加载: ${name}`, 'info');
            Toast.showSuccess(`状态已加载: ${name}`);
        } catch (e) {
            addLog(`加载请求失败: ${e.message}`, 'error');
            Toast.showError(`加载请求失败: ${e.message}`);
        }
    }

    // 刷新存档列表
    async refreshSavesList() {
        try {
            const response = await fetch('/api/saves');
            const result = await response.json();
            if (result.success) {
                const select = document.getElementById('savesList');
                if (!select) return;
                select.innerHTML = '<option value="">-- 选择存档 --</option>';
                result.saves.forEach(save => {
                    const option = document.createElement('option');
                    option.value = save.name;
                    const date = new Date(save.mtime * 1000).toLocaleString();
                    option.textContent = `${save.name} (${date})`;
                    select.appendChild(option);
                });
                Toast.showInfo(`已刷新存档列表，共 ${result.saves.length} 个存档`);
            }
        } catch (e) {
            console.error('刷新存档列表失败:', e);
            Toast.showError('刷新存档列表失败');
        }
    }

    // 删除存档
    async deleteSave(name) {
        if (!name) {
            addLog('请选择要删除的存档', 'warning');
            Toast.showWarning('请选择要删除的存档');
            return;
        }
        if (!confirm(`确定要删除存档 "${name}" 吗？`)) return;
        try {
            const response = await fetch(`/api/delete?name=${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                addLog(`存档已删除: ${name}`, 'info');
                Toast.showSuccess(`存档已删除: ${name}`);
                this.refreshSavesList();
            } else {
                addLog(`删除失败: ${result.error}`, 'error');
                Toast.showError(`删除失败: ${result.error}`);
            }
        } catch (e) {
            addLog(`删除请求失败: ${e.message}`, 'error');
            Toast.showError(`删除请求失败: ${e.message}`);
        }
    }

    // 删除所有存档
    async deleteAllSaves() {
        if (!confirm('确定要删除所有存档吗？此操作不可恢复！')) return;
        try {
            const response = await fetch('/api/delete_all', {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                addLog(`已删除 ${result.count} 个存档`, 'info');
                Toast.showSuccess(`已删除 ${result.count} 个存档`);
                this.refreshSavesList();
            } else {
                addLog(`删除失败: ${result.error}`, 'error');
                Toast.showError(`删除失败: ${result.error}`);
            }
        } catch (e) {
            addLog(`删除请求失败: ${e.message}`, 'error');
            Toast.showError(`删除请求失败: ${e.message}`);
        }
    }

    // 复制存档
    async copySave(name) {
        if (!name) {
            addLog('请选择要复制的存档', 'warning');
            Toast.showWarning('请选择要复制的存档');
            return;
        }
        const newName = prompt('请输入新存档名称（留空自动生成）', `${name}_copy`);
        if (newName === null) return;
        try {
            const response = await fetch('/api/copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: name, target: newName || undefined })
            });
            const result = await response.json();
            if (result.success) {
                addLog(`存档已复制: ${result.target}`, 'info');
                Toast.showSuccess(`存档已复制: ${result.target}`);
                this.refreshSavesList();
            } else {
                addLog(`复制失败: ${result.error}`, 'error');
                Toast.showError(`复制失败: ${result.error}`);
            }
        } catch (e) {
            addLog(`复制请求失败: ${e.message}`, 'error');
            Toast.showError(`复制请求失败: ${e.message}`);
        }
    }

    // 重命名存档
    async renameSave(name) {
        if (!name) {
            addLog('请选择要重命名的存档', 'warning');
            Toast.showWarning('请选择要重命名的存档');
            return;
        }
        const newName = prompt('请输入新名称', name);
        if (!newName || newName === name) return;
        try {
            const response = await fetch('/api/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: name, target: newName })
            });
            const result = await response.json();
            if (result.success) {
                addLog(`存档已重命名为: ${newName}`, 'info');
                Toast.showSuccess(`存档已重命名为: ${newName}`);
                this.refreshSavesList();
            } else {
                addLog(`重命名失败: ${result.error}`, 'error');
                Toast.showError(`重命名失败: ${result.error}`);
            }
        } catch (e) {
            addLog(`重命名请求失败: ${e.message}`, 'error');
            Toast.showError(`重命名请求失败: ${e.message}`);
        }
    }

    // 跟随流星
    followMeteor(meteorId) {
        const meteor = state.meteors.find(m => m.listId === meteorId);
        if (!meteor) return;
        this.camera.followMeteor(meteor);
        addLog(`已跟随流星 #${meteorId}`, 'info');
        Toast.showInfo(`已跟随流星 #${meteorId}`);
    }

    // 重置摄像机
    resetCamera() {
        this.camera.reset();
        addLog('摄像机已重置', 'info');
        Toast.showInfo('摄像机已重置');
    }

    // 键盘事件
    handleKeyDown(event) {
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const key = event.code;
        const preventKeys = ['Space', 'KeyR', 'KeyD'];
        if (preventKeys.includes(key)) {
            event.preventDefault();
        }

        switch (key) {
            case 'Space':
                this.togglePause();
                break;
            case 'KeyR':
                this.resetSimulation();
                break;
            case 'KeyD':
                detonateAllMeteors();
                break;
            default:
                break;
        }
    }

    hideHints() {
        const hint = document.querySelector('.hint');
        if (hint) {
            hint.style.opacity = '0';
            hint.style.pointerEvents = 'none';
            setTimeout(() => {
                hint.style.display = 'none';
            }, 500);
        }

        const scrollHint = document.getElementById('scrollHint');
        if (scrollHint) {
            scrollHint.style.opacity = '0';
            scrollHint.style.pointerEvents = 'none';
            setTimeout(() => {
                scrollHint.style.display = 'none';
            }, 500);
        }

        addLog('提示已隐藏', 'info');
    }

    setupConfigListeners() {
        config.onChange('autoCreateMeteors', (value) => {
            if (value) {
                this.startAutoMeteorCreation();
            } else {
                this.stopAutoMeteorCreation();
            }
        });

        config.onChange('meteorCount', () => {});
        config.onChange('trailLength', (value) => this.updateAllTrailsLength(value));
        config.onChange('autoUpdateCharts', (value) => value ? this.startChartUpdates() : this.stopChartUpdates());
        config.onChange('chartUpdateInterval', () => this.restartChartUpdates());
    }

    startChartUpdates() {
        if (this.chartUpdateTimer) clearInterval(this.chartUpdateTimer);
        if (config.autoUpdateCharts) {
            this.chartUpdateTimer = setInterval(() => updateAllCharts(), config.chartUpdateInterval);
            addLog(`图表自动更新已启动，间隔 ${config.chartUpdateInterval / 1000}s`, 'info');
        }
    }

    stopChartUpdates() {
        if (this.chartUpdateTimer) {
            clearInterval(this.chartUpdateTimer);
            this.chartUpdateTimer = null;
        }
    }

    restartChartUpdates() {
        this.stopChartUpdates();
        this.startChartUpdates();
    }

    updateAllTrailsLength(length) {
        state.meteors.forEach(meteor => {
            meteor.maxTrailLength = length;
            if (meteor.trail.length > length) meteor.trail = meteor.trail.slice(-length);
        });
    }

    generateStars() {
        const canvas = state.canvas;
        if (!canvas) return;
        const count = 300;
        const stars = [];
        const extra = this.STARS_EXTRA;
        for (let i = 0; i < count; i++) {
            stars.push({
                x: -extra + Math.random() * (canvas.width + 2 * extra),
                y: -extra + Math.random() * (canvas.height + 2 * extra),
                radius: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.3
            });
        }
        this.starsArray = stars;
    }

    initCanvas() {
        try {
            const canvas = document.getElementById('blackHoleCanvas');
            if (!canvas) throw new Error('Canvas元素不存在');
            const ctx = canvas.getContext('2d');
            state.setCanvas(canvas);
            state.setCtx(ctx);

            // 根据配置设置初始尺寸
            if (config.adaptiveCanvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            } else {
                canvas.width = config.canvasWidth;
                canvas.height = config.canvasHeight;
            }
            state.blackHole.x = canvas.width / 2;
            state.blackHole.y = canvas.height / 2;
            this.generateStars();

            if (config.adaptiveCanvas) {
                window.addEventListener('resize', this.resizeCanvas);
            }

            // 初始化输入模块，传入放置流星的回调（屏幕坐标）
            initInput(canvas, (screenX, screenY) => this.addMeteorAt(screenX, screenY));

            addLog('画布初始化成功', 'info');
            updateProgress(10, '画布初始化完成');
        } catch (error) {
            showCriticalError(error, '画布初始化失败');
        }
    }

    toggleDebugInfo() {
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            if (debugInfo.style.display === 'block') {
                debugInfo.style.display = 'none';
                addLog('调试信息已隐藏', 'info');
            } else {
                debugInfo.style.display = 'block';
                this.updateDebugInfoContent();
                addLog('调试信息已显示', 'info');
            }
        } else {
            addLog('调试信息元素不存在', 'warning');
        }
    }

    updateDebugInfoContent() {
        const debugInfo = document.getElementById('debugInfo');
        if (!debugInfo || debugInfo.style.display !== 'block') return;

        const memoryInfo = performance.memory ?
            (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + 'MB' :
            'N/A';

        const boundaryText = (mode) => {
            switch (mode) {
                case 'remove': return '清除';
                case 'bounce': return '反弹';
                case 'ignore': return '不处理';
                default: return mode;
            }
        };

        debugInfo.innerHTML = `
            <div style="padding: 5px; font-family: monospace; font-size: 12px;">
                <div>FPS: ${this.fps}</div>
                <div>流星: ${state.meteors.length}</div>
                <div>尘埃: ${state.dustParticles.length}</div>
                <div>画布: ${state.canvas?.width || 0}x${state.canvas?.height || 0}</div>
                <div>黑洞: (${Math.round(state.blackHole.x)}, ${Math.round(state.blackHole.y)})</div>
                <div>内存: ${memoryInfo}</div>
                <div>页面可见: ${!document.hidden ? '是' : '否'}</div>
                <div>边界模式: ${boundaryText(config.boundaryMode)}</div>
                <div>摄像机: (${Math.round(this.camera.offsetX)}, ${Math.round(this.camera.offsetY)}) 缩放: ${this.camera.scale.toFixed(2)}x</div>
                <div>摄像机移动: ${config.cameraMoveEnabled ? '启用' : '禁用'}</div>
            </div>
        `;
    }

    /**
     * 添加流星（接收屏幕坐标，内部转换为世界坐标）
     * @param {number} screenX 屏幕X坐标（相对于画布左上角）
     * @param {number} screenY 屏幕Y坐标（相对于画布左上角）
     */
    addMeteorAt(screenX, screenY) {
        try {
            // 将屏幕坐标转换为世界坐标（考虑摄像机偏移和缩放）
            const worldPos = this.camera.screenToWorld(screenX, screenY);
            const meteor = new Meteor(true, worldPos.x, worldPos.y);
            state.meteors.push(meteor);
            incrementCreatedMeteor(meteor.speed);
            addLog(`手动添加流星 #${meteor.listId}`, 'info');
        } catch (error) {
            addLog(`添加流星失败: ${error.message}`, 'error');
        }
    }

    clearAllMeteors() {
        state.meteors = [];
        clearMeteorList();
        addLog('已清除所有流星', 'warning');
        Toast.showWarning('已清除所有流星');
    }

    resetSimulation() {
        state.meteors = [];
        state.dustParticles = [];
        clearMeteorList();
        resetStats();
        setStartTime(Date.now());
        this.stopAutoMeteorCreation();
        if (config.autoCreateMeteors) this.startAutoMeteorCreation();
        this.camera.reset();
        addLog('模拟已重置', 'info');
        Toast.showInfo('模拟已重置');
    }

    startAutoMeteorCreation() {
        if (this.autoMeteorInterval) clearInterval(this.autoMeteorInterval);
        this.autoMeteorInterval = setInterval(() => {
            if (config.autoCreateMeteors && state.meteors.length < config.meteorCount) {
                const meteor = new Meteor();
                state.meteors.push(meteor);
            }
        }, 1000);
        addLog('自动流星创建已启动', 'info');
    }

    stopAutoMeteorCreation() {
        if (this.autoMeteorInterval) {
            clearInterval(this.autoMeteorInterval);
            this.autoMeteorInterval = null;
        }
    }

    resizeCanvas() {
        if (!config.adaptiveCanvas) return;

        try {
            const canvas = state.canvas;
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            state.blackHole.x = canvas.width / 2;
            state.blackHole.y = canvas.height / 2;
            this.generateStars();
            const canvasSizeEl = document.getElementById('canvasSize');
            if (canvasSizeEl) canvasSizeEl.textContent = `${canvas.width}x${canvas.height}`;
            addLog(`画布调整: ${canvas.width}x${canvas.height}`, 'info');
        } catch (error) {
            showCriticalError(error, '调整画布大小时出错');
        }
    }

    updatePerformanceStats(currentTime) {
        this.frameCount++;
        if (currentTime >= this.lastTime + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
            const fpsEl = document.getElementById('fpsValue');
            if (fpsEl) fpsEl.textContent = this.fps;
            if (performance.memory) {
                const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
                const memoryEl = document.getElementById('memoryUsage');
                if (memoryEl) memoryEl.textContent = used;
                setCurrentMemory(used);
            }
            setCurrentFps(this.fps);
            const avgFrame = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length || 0;
            setCurrentFrameTime(avgFrame);
        }
        const frameTime = currentTime - (this.lastTime - 1000);
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxFrameTimeSamples) this.frameTimes.shift();
        const avgFrame = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length || 0;
        const frameTimeEl = document.getElementById('frameTimeValue');
        if (frameTimeEl) frameTimeEl.textContent = avgFrame.toFixed(1);
        this.updateDebugInfoContent();
    }

    updatePhysics() {
        physicsUpdate();
        for (let i = state.meteors.length - 1; i >= 0; i--) {
            const m = state.meteors[i];
            m.update();
            if (m.consumed || m.removed) state.meteors.splice(i, 1);
        }
        for (let i = state.dustParticles.length - 1; i >= 0; i--) {
            const d = state.dustParticles[i];
            d.update();
            if (d.consumed) state.dustParticles.splice(i, 1);
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.innerHTML = this.isPaused ? '<i class="fas fa-play"></i> 继续模拟' : '<i class="fas fa-pause"></i> 暂停模拟';
        }
        addLog(this.isPaused ? '模拟暂停' : '模拟继续', 'info');
        const animStatusEl = document.getElementById('animationStatus');
        if (animStatusEl) animStatusEl.textContent = this.isPaused ? '已暂停' : '运行中';
    }

    animate(currentTime) {
        try {
            if (this.lastAnimationTime === 0) {
                this.lastAnimationTime = currentTime;
                this.animationId = requestAnimationFrame(this.animate);
                return;
            }
            const delta = currentTime - this.lastAnimationTime;
            this.lastAnimationTime = currentTime;
            const safeDelta = Math.min(delta, 100);
            this.updatePerformanceStats(currentTime);

            const ctx = state.ctx;
            const canvas = state.canvas;
            if (!ctx || !canvas) {
                this.animationId = requestAnimationFrame(this.animate);
                return;
            }

            if (!this.isPaused) {
                this.accumulator += safeDelta * config.timeScale;
                while (this.accumulator >= this.physicsTimestep) {
                    this.updatePhysics();
                    this.accumulator -= this.physicsTimestep;
                }
                updateEffects();
            } else {
                this.accumulator = 0;
            }

            this.camera.update();
            updateCameraControls();

            Renderer.clear(ctx, canvas.width, canvas.height);
            Renderer.drawStars(ctx, this.starsArray, this.camera);
            Renderer.drawBlackHole(ctx, this.camera);
            Renderer.drawDust(state.dustParticles, this.camera);
            Renderer.drawMeteors(state.meteors, this.camera);

            ctx.save();
            if (this.camera) {
                ctx.translate(-this.camera.offsetX, -this.camera.offsetY);
                ctx.scale(this.camera.scale, this.camera.scale);
            }
            drawEffects(ctx);
            ctx.restore();

            updateMeteorLabelWithCamera(this.camera);
            Renderer.drawDebugInfo(ctx, {
                fps: this.fps,
                meteorCount: state.meteors.length,
                dustCount: state.dustParticles.length
            });

            const animStatusEl = document.getElementById('animationStatus');
            if (animStatusEl) animStatusEl.textContent = this.isPaused ? '已暂停' : '运行中';

            if (this.frameCount % 10 === 0) {
                updateStats();
                updateMeteorListDisplay();
            }
            if (this.frameCount % 5 === 0) updateCurrentMeteorDetail();
        } catch (error) {
            showCriticalError(error, '动画循环中出错');
        }
        this.animationId = requestAnimationFrame(this.animate);
    }

    start() {
        try {
            addLog('黑洞模拟器启动中...', 'info');
            updateProgress(5, '开始初始化...');

            updateProgress(15, '初始化UI面板...');
            initUI();

            updateProgress(30, '初始化流星列表...');
            initMeteorList();

            updateProgress(40, '初始化流星详情...');
            initMeteorDetailButtons();

            initCameraControls(this.camera);

            updateProgress(50, '初始化图表系统...');
            initializeCharts().then(chartsInitialized => {
                if (chartsInitialized) this.startChartUpdates();
            }).catch(err => addLog('图表初始化失败: ' + err.message, 'error'));

            const updateChartsBtn = document.getElementById('updateChartsBtn');
            if (updateChartsBtn) updateChartsBtn.addEventListener('click', () => updateAllCharts());
            const clearChartsBtn = document.getElementById('clearAllChartsBtn');
            if (clearChartsBtn) {
                clearChartsBtn.addEventListener('click', () => {
                    if (confirm('清除所有图表数据？')) clearAllChartData();
                });
            }
            const exportChartBtn = document.getElementById('exportChartDataBtn');
            if (exportChartBtn) exportChartBtn.addEventListener('click', exportChartData);

            // 存档按钮
            const saveBtn = document.getElementById('saveStateBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const nameInput = document.getElementById('saveNameInput');
                    const name = nameInput ? nameInput.value.trim() || null : null;
                    this.saveState(name);
                });
            }
            const loadBtn = document.getElementById('loadStateBtn');
            if (loadBtn) {
                loadBtn.addEventListener('click', () => {
                    const select = document.getElementById('savesList');
                    if (select && select.value) this.loadState(select.value);
                    else Toast.showWarning('请先选择要加载的存档');
                });
            }
            const refreshBtn = document.getElementById('refreshSavesBtn');
            if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshSavesList());

            const deleteBtn = document.getElementById('deleteSaveBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    const select = document.getElementById('savesList');
                    if (select && select.value) this.deleteSave(select.value);
                    else Toast.showWarning('请先选择要删除的存档');
                });
            }
            const deleteAllBtn = document.getElementById('deleteAllSavesBtn');
            if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => this.deleteAllSaves());
            const copyBtn = document.getElementById('copySaveBtn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const select = document.getElementById('savesList');
                    if (select && select.value) this.copySave(select.value);
                    else Toast.showWarning('请先选择要复制的存档');
                });
            }
            const renameBtn = document.getElementById('renameSaveBtn');
            if (renameBtn) {
                renameBtn.addEventListener('click', () => {
                    const select = document.getElementById('savesList');
                    if (select && select.value) this.renameSave(select.value);
                    else Toast.showWarning('请先选择要重命名的存档');
                });
            }

            this.refreshSavesList();

            updateProgress(55, '绑定控件...');
            const debugToggle = document.getElementById('debugToggle');
            if (debugToggle) {
                const newDebugToggle = debugToggle.cloneNode(true);
                debugToggle.parentNode.replaceChild(newDebugToggle, debugToggle);
                newDebugToggle.addEventListener('click', (e) => { e.preventDefault(); this.toggleDebugInfo(); });
            }

            const resetCameraBtn = document.getElementById('resetCameraBtn');
            if (resetCameraBtn) resetCameraBtn.addEventListener('click', () => this.resetCamera());

            window.addEventListener('keydown', this.handleKeyDown);
            this.keyboardBound = true;

            setTimeout(() => this.hideHints(), 5000);

            updateProgress(70, '启动动画循环...');
            this.animationId = requestAnimationFrame(this.animate);

            if (config.autoCreateMeteors) {
                updateProgress(85, '启动自动流星创建...');
                this.startAutoMeteorCreation();
            }

            updateProgress(95, '最终准备...');
            addLog('黑洞模拟器启动完成', 'info');
            if (window.finishLoading) window.finishLoading();
        } catch (error) {
            showCriticalError(error, '启动模拟器时出错');
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.stopAutoMeteorCreation();
        this.stopChartUpdates();
        window.removeEventListener('resize', this.resizeCanvas);
        cleanupInput();
        cleanupCameraControls();
        if (this.keyboardBound) {
            window.removeEventListener('keydown', this.handleKeyDown);
            this.keyboardBound = false;
        }
        addLog('模拟器已停止', 'warning');
    }
}

let simulator;
try {
    simulator = new BlackHoleSimulator();

    window.simulator = simulator;
    window.simulator.addMeteorAt = simulator.addMeteorAt.bind(simulator);
    window.simulator.clearAllMeteors = simulator.clearAllMeteors.bind(simulator);
    window.simulator.resetSimulation = simulator.resetSimulation.bind(simulator);
    window.simulator.togglePause = simulator.togglePause.bind(simulator);
    window.simulator.saveState = simulator.saveState.bind(simulator);
    window.simulator.loadState = simulator.loadState.bind(simulator);
    window.simulator.refreshSavesList = simulator.refreshSavesList.bind(simulator);
    window.simulator.deleteSave = simulator.deleteSave.bind(simulator);
    window.simulator.deleteAllSaves = simulator.deleteAllSaves.bind(simulator);
    window.simulator.copySave = simulator.copySave.bind(simulator);
    window.simulator.renameSave = simulator.renameSave.bind(simulator);
    window.simulator.followMeteor = simulator.followMeteor.bind(simulator);
    window.simulator.resetCamera = simulator.resetCamera.bind(simulator);

    window.destroyMeteor = destroyMeteor;
    window.detonateAllMeteors = detonateAllMeteors;
    window.exportStats = exportStats;
    window.showMeteorInfo = showMeteorInfo;
    window.hideMeteorLabel = hideMeteorLabel;
    window.updateAllCharts = updateAllCharts;
    window.clearAllChartData = clearAllChartData;
    window.exportChartData = exportChartData;
    window.Toast = Toast;

    window.persistentMeteorId = null;
    window.mouseX = 0;
    window.mouseY = 0;

    addLog('模拟器实例创建成功', 'debug');
} catch (error) {
    showCriticalError(error, '创建模拟器实例时出错');
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && simulator && !simulator.animationId && !simulator.isPaused) {
        simulator.animationId = requestAnimationFrame(simulator.animate.bind(simulator));
    }
});

window.addEventListener('criticalerror', () => {
    if (simulator) simulator.stop();
});

module.exports = simulator;
