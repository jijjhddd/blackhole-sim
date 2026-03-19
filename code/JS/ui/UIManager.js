// code/JS/ui/UIManager.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');
const { formatScientificNotation, getBoundaryModeText, getHeightLabel } = require('../utils/helpers.js');
const Toast = require('./Toast.js');

// ==================== 面板状态变量 ====================
let panelOpacity = 95;
let currentPanelHeight = 55;
let pendingPanelHeight = 55;
let observationMode = false;

// ==================== 滑块防误触 ====================
let isScrolling = false;
let scrollTimer = null;

// 更新时间缩放显示颜色
function updateTimeScaleDisplay(value) {
    const display = document.getElementById('timeScaleValue');
    if (!display) return;
    const numValue = Number(value);
    if (isNaN(numValue)) return;
    display.textContent = numValue.toFixed(1) + 'x';
    if (numValue < 1) {
        display.style.color = '#4a9eff';
    } else if (numValue > 1) {
        display.style.color = '#ff5555';
    } else {
        display.style.color = '#a0c8ff';
    }
}

function resetAllSettings() {
    config.blackHoleStrength = 180000;
    config.blackHoleSize = 30;
    config.gravityFalloff = 1.6;
    config.minGravityDistance = 15;
    config.safetyZoneRadius = 150;
    config.meteorSpeedBase = 1.5;
    config.meteorCount = 15;
    config.meteorMaxSize = 11;
    config.boundaryMode = 'remove';
    config.autoCreateMeteors = false;
    config.clickPlacementEnabled = true;
    config.clickCooldownEnabled = false;
    config.clickCooldownTime = 1.0;
    config.longPressAddMeteors = false;
    config.longPressDelay = 500;
    config.longPressIntervalTime = 100;
    config.swipePlacementSpeed = 5;
    config.showTrails = true;
    config.trailLength = 50;
    config.showSafetyZone = false;
    config.showEventHorizon = false;
    config.showGravityGradient = false;
    config.showGravitationalLens = true;
    config.lensStrength = 0.3;
    config.lensRadius = 200;
    config.showMeteorLabels = true;
    config.sliderProtectionEnabled = true;
    config.maxDustParticles = 2000;
    config.maxChartDataPoints = 300;
    config.chartUpdateInterval = 1000;
    config.autoUpdateCharts = true;
    config.chartAnimations = false;
    config.logErrors = true;
    config.logWarnings = true;
    config.logInfo = true;
    config.logDebug = false;
    config.timeScale = 1.0;
    config.cameraMoveEnabled = true;
    
    state.blackHole.radius = config.blackHoleSize;
    
    updateAllSliders();
    updateAllCheckboxes();
    const boundarySelect = document.getElementById('boundaryModeSelect');
    if (boundarySelect) boundarySelect.value = config.boundaryMode;
    
    updateBlackHoleProperties();
    updateTimeScaleDisplay(1.0);
    
    addLog('所有设置已重置为默认值', 'info');
    Toast.showSuccess('所有设置已重置');
}

function updateAllSliders() {
    const sliders = [
        { id: 'blackHoleStrengthSlider', value: config.blackHoleStrength },
        { id: 'blackHoleSizeSlider', value: config.blackHoleSize },
        { id: 'gravityFalloffSlider', value: config.gravityFalloff },
        { id: 'minGravityDistanceSlider', value: config.minGravityDistance },
        { id: 'safetyZoneSlider', value: config.safetyZoneRadius },
        { id: 'meteorSpeedSlider', value: config.meteorSpeedBase },
        { id: 'meteorCountSlider', value: config.meteorCount },
        { id: 'meteorSizeSlider', value: config.meteorMaxSize },
        { id: 'maxDustParticlesSlider', value: config.maxDustParticles },
        { id: 'trailLengthSlider', value: config.trailLength },
        { id: 'lensStrengthSlider', value: config.lensStrength },
        { id: 'lensRadiusSlider', value: config.lensRadius },
        { id: 'clickCooldownSlider', value: config.clickCooldownTime },
        { id: 'longPressDelaySlider', value: config.longPressDelay / 1000 },
        { id: 'longPressIntervalSlider', value: config.longPressIntervalTime / 1000 },
        { id: 'swipePlacementSpeedSlider', value: config.swipePlacementSpeed },
        { id: 'chartUpdateIntervalSlider', value: config.chartUpdateInterval / 1000 },
        { id: 'chartDataPointsLimitSlider', value: config.maxChartDataPoints },
        { id: 'panelOpacitySlider', value: panelOpacity },
        { id: 'panelHeightSlider', value: pendingPanelHeight },
        { id: 'timeScaleSlider', value: config.timeScale }
    ];
    sliders.forEach(({ id, value }) => {
        const slider = document.getElementById(id);
        if (slider) slider.value = value;
    });
}

function updateAllCheckboxes() {
    const longPressCheckbox = document.getElementById('longPressCheckbox');
    if (longPressCheckbox) longPressCheckbox.checked = config.longPressAddMeteors;
    const autoMeteorCheckbox = document.getElementById('autoMeteorCheckbox');
    if (autoMeteorCheckbox) autoMeteorCheckbox.checked = config.autoCreateMeteors;
    const clickPlacementCheckbox = document.getElementById('clickPlacementCheckbox');
    if (clickPlacementCheckbox) clickPlacementCheckbox.checked = config.clickPlacementEnabled;
    const clickCooldownCheckbox = document.getElementById('clickCooldownCheckbox');
    if (clickCooldownCheckbox) clickCooldownCheckbox.checked = config.clickCooldownEnabled;
    
    const visualCheckboxes = [
        { id: 'showTrailsCheckbox', prop: 'showTrails' },
        { id: 'showSafetyZoneCheckbox', prop: 'showSafetyZone' },
        { id: 'showEventHorizonCheckbox', prop: 'showEventHorizon' },
        { id: 'showGravityGradientCheckbox', prop: 'showGravityGradient' },
        { id: 'showGravitationalLensCheckbox', prop: 'showGravitationalLens' },
        { id: 'showMeteorLabelsCheckbox', prop: 'showMeteorLabels' },
        { id: 'sliderProtectionCheckbox', prop: 'sliderProtectionEnabled' }
    ];
    visualCheckboxes.forEach(({ id, prop }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = config[prop];
    });
    
    const logCheckboxes = [
        { id: 'logErrorsCheckbox', prop: 'logErrors' },
        { id: 'logWarningsCheckbox', prop: 'logWarnings' },
        { id: 'logInfoCheckbox', prop: 'logInfo' },
        { id: 'logDebugCheckbox', prop: 'logDebug' }
    ];
    logCheckboxes.forEach(({ id, prop }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = config[prop];
    });
    
    const chartAutoUpdate = document.getElementById('autoUpdateChartsCheckbox');
    if (chartAutoUpdate) chartAutoUpdate.checked = config.autoUpdateCharts;
    const chartAnimations = document.getElementById('chartAnimationsCheckbox');
    if (chartAnimations) chartAnimations.checked = config.chartAnimations;
    const cameraMoveCheckbox = document.getElementById('cameraMoveCheckbox');
    if (cameraMoveCheckbox) cameraMoveCheckbox.checked = config.cameraMoveEnabled;
}

function updateBlackHoleProperties() {
    const ids = {
        blackHoleStrength: formatScientificNotation(config.blackHoleStrength),
        eventHorizonRadius: config.blackHoleSize,
        gravityFalloffValue: config.gravityFalloff.toFixed(1),
        safetyZoneRadius: config.safetyZoneRadius,
        blackHoleStrengthValue: formatScientificNotation(config.blackHoleStrength),
        blackHoleSizeValue: config.blackHoleSize,
        gravityFalloffDisplay: config.gravityFalloff.toFixed(1),
        minGravityDistanceValue: config.minGravityDistance,
        safetyZoneValue: config.safetyZoneRadius,
        speedValue: config.meteorSpeedBase.toFixed(1),
        countValue: config.meteorCount,
        meteorSizeValue: `3-${config.meteorMaxSize}`,
        trailLengthValue: config.trailLength,
        lensStrengthValue: config.lensStrength.toFixed(2),
        lensRadiusValue: config.lensRadius,
        cooldownValue: config.clickCooldownTime.toFixed(1),
        longPressDelayValue: (config.longPressDelay / 1000).toFixed(1),
        longPressIntervalValue: (config.longPressIntervalTime / 1000).toFixed(2),
        swipePlacementSpeedValue: config.swipePlacementSpeed,
        boundaryModeValue: getBoundaryModeText(config.boundaryMode),
        chartUpdateIntervalValue: (config.chartUpdateInterval / 1000).toFixed(1),
        chartDataPointsLimitValue: config.maxChartDataPoints,
        maxDustParticlesValue: config.maxDustParticles,
        statsUpdateRateValue: '1.0',
        statsHistorySizeValue: '50'
    };
    for (const [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
    const cci = document.getElementById('currentChartInterval');
    if (cci) cci.textContent = (config.chartUpdateInterval / 1000).toFixed(1);
    const cdl = document.getElementById('currentChartDataPointsLimit');
    if (cdl) cdl.textContent = config.maxChartDataPoints;
}

function updatePanelOpacity() {
    const bp = document.getElementById('bottom-panel');
    if (bp) bp.style.background = `rgba(0,15,50,${panelOpacity / 100})`;
    const opacityEl = document.getElementById('panelOpacityValue');
    if (opacityEl) opacityEl.textContent = `${panelOpacity}%`;
}

function applyPanelHeightNow() {
    currentPanelHeight = pendingPanelHeight;
    const h = window.innerHeight * currentPanelHeight / 100;
    const bp = document.getElementById('bottom-panel');
    const pc = document.querySelector('.panel-content');
    if (bp) bp.style.maxHeight = `${h}px`;
    if (pc) pc.style.maxHeight = `${h - 100}px`;
    const heightTextEl = document.getElementById('currentPanelHeightText');
    if (heightTextEl) heightTextEl.textContent = `${currentPanelHeight}% (${getHeightLabel(currentPanelHeight)})`;
    const heightValueEl = document.getElementById('panelHeightValue');
    if (heightValueEl) heightValueEl.textContent = `${currentPanelHeight}%`;
    const btn = document.getElementById('applyPanelHeightBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i> 已应用当前高度';
    }
}

function updatePanelHeightUI() {
    const heightValueEl = document.getElementById('panelHeightValue');
    if (heightValueEl) heightValueEl.textContent = `${pendingPanelHeight}%`;
    const btn = document.getElementById('applyPanelHeightBtn');
    if (btn) {
        btn.disabled = (pendingPanelHeight === currentPanelHeight);
        btn.innerHTML = btn.disabled ? '<i class="fas fa-check"></i> 已应用当前高度' : '<i class="fas fa-check"></i> 应用面板高度';
    }
}

function togglePanel() {
    const pc = document.getElementById('panel-container');
    const pi = document.getElementById('panel-indicator');
    if (!pc || !pi) return;
    pc.classList.toggle('collapsed');
    const collapsed = pc.classList.contains('collapsed');
    const span = pi.querySelector('span');
    if (span) span.textContent = collapsed ? '展开控制面板' : '收起控制面板';
    const icon = pi.querySelector('i');
    if (icon) icon.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    addLog(collapsed ? '面板折叠' : '面板展开', 'info');
}

function setObservationMode(mode) {
    observationMode = mode;
    // 使用静态观察按钮 id="observer-toggle"
    const eyeBtn = document.getElementById('observer-toggle');
    if (eyeBtn) {
        eyeBtn.style.backgroundColor = mode ? '#ffaa55' : '#4a9eff';
    }
}

/**
 * 初始化眼睛按钮 - 使用 HTML 中已有的静态按钮
 */
function initEyeButton() {
    const eyeBtn = document.getElementById('observer-toggle');
    if (!eyeBtn) return;

    // 添加与昆虫图标一致的样式类（保持风格统一）
    eyeBtn.classList.add('debug-toggle');
    eyeBtn.style.bottom = '80px'; // 位于昆虫图标上方
    eyeBtn.style.backgroundColor = observationMode ? '#ffaa55' : '#4a9eff';
    
    // 移除可能存在的旧监听器（通过克隆替换避免重复绑定）
    const newEyeBtn = eyeBtn.cloneNode(true);
    eyeBtn.parentNode.replaceChild(newEyeBtn, eyeBtn);
    
    newEyeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.simulator && window.simulator.toggleObservationMode) {
            window.simulator.toggleObservationMode();
        }
    });
}

function initTabs() {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tabId = this.dataset.tab;
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) targetTab.classList.add('active');
            addLog(`切换到 ${this.textContent.trim()} 面板`, 'info');
        });
    });
}

function initSubTabs() {
    document.querySelectorAll('.sub-tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sub-tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
            const subtabId = this.dataset.subtab;
            const targetSubtab = document.getElementById(`${subtabId}-subtab`);
            if (targetSubtab) targetSubtab.classList.add('active');
            addLog(`切换到 ${this.textContent.trim()}`, 'info');
        });
    });
}

function initMeteorDetailTabs() {
    document.querySelectorAll('.meteor-detail-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.meteor-detail-tab').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.meteor-detail-content').forEach(c => c.classList.remove('active'));
            const contentId = `${this.dataset.tab}-content`;
            const targetContent = document.getElementById(contentId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

function initPanelHeightPresets() {
    document.querySelectorAll('.panel-height-preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            pendingPanelHeight = parseInt(this.dataset.height);
            updatePanelHeightUI();
        });
    });
}

function bindSlider(sliderId, valueDisplayId, updateFunc, postProcessor) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(valueDisplayId);
    if (!slider) return;
    let timeout = null;
    slider.addEventListener('input', function() {
        if (display) display.textContent = postProcessor ? postProcessor(this.value) : this.value;
    });
    slider.addEventListener('change', function() {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            const value = parseFloat(this.value);
            if (!isNaN(value)) updateFunc(value);
        }, 300);
    });
    if (display) display.textContent = postProcessor ? postProcessor(slider.value) : slider.value;
}

function initSliders() {
    bindSlider('blackHoleStrengthSlider', 'blackHoleStrengthValue', 
        (v) => { config.blackHoleStrength = v; updateBlackHoleProperties(); addLog(`引力强度: ${formatScientificNotation(config.blackHoleStrength)}`, 'info'); }, 
        v => formatScientificNotation(parseInt(v)));
    bindSlider('blackHoleSizeSlider', 'blackHoleSizeValue', 
        (v) => { config.blackHoleSize = v; state.blackHole.radius = v; updateBlackHoleProperties(); addLog(`黑洞大小: ${config.blackHoleSize}px`, 'info'); });
    bindSlider('gravityFalloffSlider', 'gravityFalloffDisplay', 
        (v) => { config.gravityFalloff = v; updateBlackHoleProperties(); addLog(`衰减指数: ${config.gravityFalloff.toFixed(1)}`, 'info'); }, 
        v => parseFloat(v).toFixed(1));
    bindSlider('minGravityDistanceSlider', 'minGravityDistanceValue', 
        (v) => { config.minGravityDistance = v; updateBlackHoleProperties(); addLog(`最小距离: ${config.minGravityDistance}px`, 'info'); });
    bindSlider('safetyZoneSlider', 'safetyZoneValue', 
        (v) => { config.safetyZoneRadius = v; updateBlackHoleProperties(); addLog(`安全区半径: ${config.safetyZoneRadius}px`, 'info'); });
    bindSlider('meteorSpeedSlider', 'speedValue', 
        (v) => { config.meteorSpeedBase = v; updateBlackHoleProperties(); addLog(`流星速度: ${config.meteorSpeedBase.toFixed(1)}`, 'info'); }, 
        v => parseFloat(v).toFixed(1));
    bindSlider('meteorCountSlider', 'countValue', 
        (v) => { config.meteorCount = v; updateBlackHoleProperties(); addLog(`流星数量上限: ${config.meteorCount}`, 'info'); });
    bindSlider('meteorSizeSlider', 'meteorSizeValue', 
        (v) => { config.meteorMaxSize = v; updateBlackHoleProperties(); addLog(`流星最大尺寸: ${config.meteorMaxSize}px`, 'info'); }, 
        v => `3-${v}`);
    bindSlider('maxDustParticlesSlider', 'maxDustParticlesValue', 
        (v) => { config.maxDustParticles = v; updateBlackHoleProperties(); addLog(`尘埃数量上限: ${config.maxDustParticles}`, 'info'); });
    bindSlider('trailLengthSlider', 'trailLengthValue', 
        (v) => { config.trailLength = v; updateBlackHoleProperties(); addLog(`轨迹长度: ${config.trailLength}`, 'info'); });
    bindSlider('lensStrengthSlider', 'lensStrengthValue', 
        (v) => { config.lensStrength = v; updateBlackHoleProperties(); addLog(`透镜强度: ${config.lensStrength.toFixed(2)}`, 'info'); }, 
        v => parseFloat(v).toFixed(2));
    bindSlider('lensRadiusSlider', 'lensRadiusValue', 
        (v) => { config.lensRadius = v; updateBlackHoleProperties(); addLog(`透镜半径: ${config.lensRadius}px`, 'info'); });
    bindSlider('clickCooldownSlider', 'cooldownValue', 
        (v) => { config.clickCooldownTime = v; updateBlackHoleProperties(); addLog(`点击冷却: ${config.clickCooldownTime.toFixed(1)}s`, 'info'); }, 
        v => parseFloat(v).toFixed(1));
    bindSlider('longPressDelaySlider', 'longPressDelayValue', 
        (v) => { config.longPressDelay = v * 1000; updateBlackHoleProperties(); addLog(`长按延迟: ${(config.longPressDelay / 1000).toFixed(1)}s`, 'info'); }, 
        v => parseFloat(v).toFixed(1));
    bindSlider('longPressIntervalSlider', 'longPressIntervalValue', 
        (v) => { config.longPressIntervalTime = v * 1000; updateBlackHoleProperties(); addLog(`长按间隔: ${(config.longPressIntervalTime / 1000).toFixed(2)}s`, 'info'); }, 
        v => parseFloat(v).toFixed(2));
    bindSlider('swipePlacementSpeedSlider', 'swipePlacementSpeedValue', 
        (v) => { config.swipePlacementSpeed = v; updateBlackHoleProperties(); addLog(`滑动速度: ${config.swipePlacementSpeed}`, 'info'); });
    bindSlider('chartUpdateIntervalSlider', 'chartUpdateIntervalValue', 
        (v) => { config.chartUpdateInterval = v * 1000; updateBlackHoleProperties(); addLog(`图表更新间隔: ${config.chartUpdateInterval / 1000}s`, 'info'); }, 
        v => parseFloat(v).toFixed(1));
    bindSlider('chartDataPointsLimitSlider', 'chartDataPointsLimitValue', 
        (v) => { config.maxChartDataPoints = v; updateBlackHoleProperties(); addLog(`图表数据点上限: ${config.maxChartDataPoints}`, 'info'); });
    bindSlider('panelOpacitySlider', 'panelOpacityValue', 
        (v) => { panelOpacity = v; updatePanelOpacity(); addLog(`面板透明度: ${panelOpacity}%`, 'info'); }, 
        v => v + '%');
    bindSlider('panelHeightSlider', 'panelHeightValue', 
        (v) => { pendingPanelHeight = v; updatePanelHeightUI(); }, 
        v => v + '%');
    bindSlider('timeScaleSlider', 'timeScaleValue', 
        (v) => { 
            const numV = Number(v);
            if (!isNaN(numV)) {
                config.timeScale = numV; 
                updateTimeScaleDisplay(numV); 
                addLog(`模拟速度: ${numV.toFixed(1)}x`, 'info');
            }
        },
        v => { const num = parseFloat(v); return isNaN(num) ? '1.0x' : num.toFixed(1) + 'x'; }
    );
    updateTimeScaleDisplay(config.timeScale);
}

function initCheckboxes() {
    const longPressCheckbox = document.getElementById('longPressCheckbox');
    if (longPressCheckbox) {
        longPressCheckbox.addEventListener('change', function(e) {
            config.longPressAddMeteors = e.target.checked;
            const settings = document.getElementById('longPressSettings');
            if (settings) settings.style.display = config.longPressAddMeteors ? 'block' : 'none';
            addLog(`长按放置: ${config.longPressAddMeteors ? '启用' : '禁用'}`, 'info');
        });
        longPressCheckbox.checked = config.longPressAddMeteors;
    }
    const autoMeteorCheckbox = document.getElementById('autoMeteorCheckbox');
    if (autoMeteorCheckbox) {
        autoMeteorCheckbox.addEventListener('change', function(e) {
            config.autoCreateMeteors = e.target.checked;
            addLog(`自动流星: ${config.autoCreateMeteors ? '启用' : '禁用'}`, 'info');
        });
        autoMeteorCheckbox.checked = config.autoCreateMeteors;
    }
    const clickPlacementCheckbox = document.getElementById('clickPlacementCheckbox');
    if (clickPlacementCheckbox) {
        clickPlacementCheckbox.addEventListener('change', function(e) {
            config.clickPlacementEnabled = e.target.checked;
            addLog(`点击放置: ${config.clickPlacementEnabled ? '启用' : '禁用'}`, 'info');
        });
        clickPlacementCheckbox.checked = config.clickPlacementEnabled;
    }
    const clickCooldownCheckbox = document.getElementById('clickCooldownCheckbox');
    if (clickCooldownCheckbox) {
        clickCooldownCheckbox.addEventListener('change', function(e) {
            config.clickCooldownEnabled = e.target.checked;
            const container = document.getElementById('cooldownSliderContainer');
            if (container) container.style.display = config.clickCooldownEnabled ? 'block' : 'none';
            addLog(`点击冷却: ${config.clickCooldownEnabled ? '启用' : '禁用'}`, 'info');
        });
        clickCooldownCheckbox.checked = config.clickCooldownEnabled;
    }
    const visualCheckboxes = [
        { id: 'showTrailsCheckbox', prop: 'showTrails' },
        { id: 'showSafetyZoneCheckbox', prop: 'showSafetyZone' },
        { id: 'showEventHorizonCheckbox', prop: 'showEventHorizon' },
        { id: 'showGravityGradientCheckbox', prop: 'showGravityGradient' },
        { id: 'showGravitationalLensCheckbox', prop: 'showGravitationalLens' },
        { id: 'showMeteorLabelsCheckbox', prop: 'showMeteorLabels' },
        { id: 'sliderProtectionCheckbox', prop: 'sliderProtectionEnabled' }
    ];
    visualCheckboxes.forEach(({ id, prop }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function(e) {
                config[prop] = e.target.checked;
                addLog(`${prop}: ${e.target.checked ? '开启' : '关闭'}`, 'info');
            });
            checkbox.checked = config[prop];
        }
    });
    const logCheckboxes = [
        { id: 'logErrorsCheckbox', prop: 'logErrors' },
        { id: 'logWarningsCheckbox', prop: 'logWarnings' },
        { id: 'logInfoCheckbox', prop: 'logInfo' },
        { id: 'logDebugCheckbox', prop: 'logDebug' }
    ];
    logCheckboxes.forEach(({ id, prop }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function(e) {
                config[prop] = e.target.checked;
                addLog(`日志${prop}: ${e.target.checked ? '开启' : '关闭'}`, 'info');
            });
            checkbox.checked = config[prop];
        }
    });
    const chartAutoUpdate = document.getElementById('autoUpdateChartsCheckbox');
    if (chartAutoUpdate) {
        chartAutoUpdate.addEventListener('change', function(e) {
            config.autoUpdateCharts = e.target.checked;
            addLog(`自动更新图表: ${e.target.checked ? '开启' : '关闭'}`, 'info');
        });
        chartAutoUpdate.checked = config.autoUpdateCharts;
    }
    const chartAnimations = document.getElementById('chartAnimationsCheckbox');
    if (chartAnimations) {
        chartAnimations.addEventListener('change', function(e) {
            config.chartAnimations = e.target.checked;
            addLog(`图表动画: ${e.target.checked ? '开启' : '关闭'}`, 'info');
        });
        chartAnimations.checked = config.chartAnimations;
    }
    const cameraMoveCheckbox = document.getElementById('cameraMoveCheckbox');
    if (cameraMoveCheckbox) {
        cameraMoveCheckbox.addEventListener('change', function(e) {
            config.cameraMoveEnabled = e.target.checked;
            addLog(`摄像机移动: ${config.cameraMoveEnabled ? '启用' : '禁用'}`, 'info');
        });
        cameraMoveCheckbox.checked = config.cameraMoveEnabled;
    }
}

function initSelects() {
    const boundarySelect = document.getElementById('boundaryModeSelect');
    if (boundarySelect) {
        boundarySelect.addEventListener('change', function(e) {
            config.boundaryMode = e.target.value;
            updateBlackHoleProperties();
            addLog(`边界模式: ${getBoundaryModeText(config.boundaryMode)}`, 'info');
        });
        boundarySelect.value = config.boundaryMode;
    }
}

function initButtons() {
    const panelIndicator = document.getElementById('panel-indicator');
    if (panelIndicator) panelIndicator.addEventListener('click', (e) => { e.preventDefault(); togglePanel(); });
    const applyHeightBtn = document.getElementById('applyPanelHeightBtn');
    if (applyHeightBtn) applyHeightBtn.addEventListener('click', applyPanelHeightNow);
    const addMeteorBtn = document.getElementById('addMeteorBtn');
    if (addMeteorBtn) {
        addMeteorBtn.addEventListener('click', () => {
            if (window.simulator && window.simulator.addMeteorAt) {
                const x = Math.random() * state.canvas.width;
                const y = Math.random() * state.canvas.height;
                window.simulator.addMeteorAt(x, y);
            } else addLog('模拟器未就绪', 'warning');
        });
    }
    const clearMeteorsBtn = document.getElementById('clearAllMeteorsBtn');
    if (clearMeteorsBtn) {
        clearMeteorsBtn.addEventListener('click', () => {
            if (window.simulator && window.simulator.clearAllMeteors) window.simulator.clearAllMeteors();
            else addLog('模拟器未就绪', 'warning');
        });
    }
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn && !pauseBtn._hasListener) {
        pauseBtn.addEventListener('click', () => { if (window.simulator) window.simulator.togglePause(); });
        pauseBtn._hasListener = true;
    }
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.simulator && window.simulator.resetSimulation) window.simulator.resetSimulation();
            else addLog('模拟器未就绪', 'warning');
        });
    }
    const resetSettingsBtn = document.getElementById('resetAllSettingsBtn');
    if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', resetAllSettings);
    const clearMeteorListBtn = document.getElementById('clearMeteorListBtn');
    if (clearMeteorListBtn) {
        clearMeteorListBtn.addEventListener('click', () => {
            try {
                const meteorDataCore = require('../data/MeteorDataCore.js');
                meteorDataCore.clearMeteorList();
                addLog('流星列表已清空', 'info');
            } catch (e) { addLog('清除流星列表失败: ' + e.message, 'error'); }
        });
    }
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            try {
                const { clearLogs } = require('../utils/logger.js');
                clearLogs();
            } catch (e) { addLog('清除日志失败: ' + e.message, 'error'); }
        });
    }
    const exportLogsBtn = document.getElementById('exportLogsBtn');
    if (exportLogsBtn) {
        exportLogsBtn.addEventListener('click', () => {
            try {
                const { exportLogs } = require('../utils/logger.js');
                exportLogs();
            } catch (e) { addLog('导出日志失败: ' + e.message, 'error'); }
        });
    }
    const copyAllLogsBtn = document.getElementById('copyAllLogsBtn');
    if (copyAllLogsBtn) {
        copyAllLogsBtn.addEventListener('click', () => {
            try {
                const { copyAllLogs } = require('../utils/logger.js');
                copyAllLogs();
            } catch (e) { addLog('复制日志失败: ' + e.message, 'error'); }
        });
    }
    const clearStatsBtn = document.getElementById('clearSimulationStatsBtn');
    if (clearStatsBtn) {
        clearStatsBtn.addEventListener('click', () => {
            try {
                const { resetStats } = require('../statistics.js');
                if (confirm('确定清除所有统计数据？')) resetStats();
            } catch (e) { addLog('清除统计失败: ' + e.message, 'error'); }
        });
    }
    const exportStatsBtn = document.getElementById('exportStatsBtn');
    if (exportStatsBtn) {
        exportStatsBtn.addEventListener('click', () => {
            try {
                const { exportStats } = require('../statistics.js');
                exportStats();
            } catch (e) { addLog('导出统计失败: ' + e.message, 'error'); }
        });
    }
    const updateChartsBtn = document.getElementById('updateChartsBtn');
    if (updateChartsBtn) {
        updateChartsBtn.addEventListener('click', () => {
            if (window.updateAllCharts) window.updateAllCharts();
        });
    }
    const clearChartsBtn = document.getElementById('clearAllChartsBtn');
    if (clearChartsBtn) {
        clearChartsBtn.addEventListener('click', () => {
            if (window.clearAllChartData && confirm('清除所有图表数据？')) window.clearAllChartData();
        });
    }
    const exportChartBtn = document.getElementById('exportChartDataBtn');
    if (exportChartBtn) {
        exportChartBtn.addEventListener('click', () => {
            if (window.exportChartData) window.exportChartData();
        });
    }
    const detonateBtn = document.getElementById('detonateAllMeteorsBtn');
    if (detonateBtn) {
        detonateBtn.addEventListener('click', () => {
            if (window.detonateAllMeteors) window.detonateAllMeteors();
            else addLog('引爆功能未就绪', 'warning');
        });
    }
    const debugToggle = document.getElementById('debugToggle');
    if (debugToggle) {
        debugToggle.addEventListener('click', () => {
            const debugInfo = document.getElementById('debugInfo');
            if (debugInfo) debugInfo.style.display = debugInfo.style.display === 'block' ? 'none' : 'block';
        });
    }
}

function initLogFilters() {
    document.querySelectorAll('.log-filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            document.querySelectorAll('.log-filter-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const filter = this.dataset.type;
            try {
                const { setLogFilter } = require('../utils/logger.js');
                setLogFilter(filter);
            } catch (e) { console.error('设置日志筛选失败:', e); }
        });
    });
}

function initSliderProtection() {
    window.addEventListener('scroll', () => {
        if (!config.sliderProtectionEnabled) return;
        isScrolling = true;
        document.querySelectorAll('.slider-wrapper').forEach(w => w.classList.add('locked'));
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            isScrolling = false;
            document.querySelectorAll('.slider-wrapper').forEach(w => w.classList.remove('locked'));
        }, 500);
    });
    addLog('滑块防误触已启用', 'info');
}

function initUI() {
    try {
        initTabs();
        initSubTabs();
        initMeteorDetailTabs();
        initPanelHeightPresets();
        initSliders();
        initCheckboxes();
        initSelects();
        initButtons();
        initLogFilters();
        initSliderProtection();
        initEyeButton(); // 使用静态按钮
        
        updateBlackHoleProperties();
        updatePanelOpacity();
        updatePanelHeightUI();
        applyPanelHeightNow();
        
        const longPressSettings = document.getElementById('longPressSettings');
        if (longPressSettings) longPressSettings.style.display = config.longPressAddMeteors ? 'block' : 'none';
        const cooldownContainer = document.getElementById('cooldownSliderContainer');
        if (cooldownContainer) cooldownContainer.style.display = config.clickCooldownEnabled ? 'block' : 'none';
        
        addLog('UI初始化完成', 'info');
    } catch (error) {
        console.error('UI初始化失败:', error);
        addLog('UI初始化失败: ' + error.message, 'error');
    }
}

module.exports = {
    initUI,
    updateBlackHoleProperties,
    togglePanel,
    applyPanelHeightNow,
    resetAllSettings,
    setObservationMode
};
