// code/JS/physics/engine.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');
const {
    ABSORPTION_RATIO,
    ANNIHILATION_RATIO,
    DESTROY_RELEASE_RATIO,
    DUST_TO_METEOR_THRESHOLD,
    PROTECTION_DURATION_FRAMES
} = require('../constants.js');
const { applyAllGravity } = require('./Gravity.js');
const Meteor = require('./Meteor.js');
const DustParticle = require('./DustParticle.js');
const { markMeteorAsRemoved, updateMeteorInList } = require('../data/MeteorDataCore.js');

// ==================== 特效模块（内嵌）====================

const SHOCKWAVE_MAX_RADIUS = 60;
const SHOCKWAVE_DURATION = 1.2;
const SHOCKWAVE_GROWTH_RATE = 3;
const CONSUMPTION_MAX_RADIUS = 50;
const CONSUMPTION_DURATION = 1.5;
const CONSUMPTION_GROWTH_RATE = 4;
const CONSUMPTION_INNER_RADIUS_RATIO = 0.6;

let shockwaveEffects = [];
let consumptionEffects = [];

function createShockwave(x, y, color) {
    addLog(`[特效] 创建冲击波 at (${x.toFixed(1)},${y.toFixed(1)}) 颜色 ${color}`, 'debug');
    shockwaveEffects.push({ x, y, color, radius: 5, maxRadius: SHOCKWAVE_MAX_RADIUS, alpha: 1, duration: 0 });
}

function createConsumptionEffect(x, y, color) {
    addLog(`[吞噬特效] 创建吞噬效果 at (${x.toFixed(1)},${y.toFixed(1)}) 颜色 ${color}`, 'info');
    consumptionEffects.push({ x, y, color, radius: 8, maxRadius: CONSUMPTION_MAX_RADIUS, alpha: 1, duration: 0 });
}

global.createConsumptionEffect = createConsumptionEffect;
global.createShockwave = createShockwave;

function updateEffects(deltaTime = 1/60) {
    for (let i = shockwaveEffects.length - 1; i >= 0; i--) {
        const s = shockwaveEffects[i];
        s.duration += deltaTime;
        s.radius += SHOCKWAVE_GROWTH_RATE;
        s.alpha = 1 - s.duration / SHOCKWAVE_DURATION;
        if (s.duration >= SHOCKWAVE_DURATION || s.alpha <= 0) shockwaveEffects.splice(i, 1);
    }
    for (let i = consumptionEffects.length - 1; i >= 0; i--) {
        const e = consumptionEffects[i];
        e.duration += deltaTime;
        e.radius += CONSUMPTION_GROWTH_RATE;
        e.alpha = 1 - e.duration / CONSUMPTION_DURATION;
        if (e.duration >= CONSUMPTION_DURATION || e.alpha <= 0) consumptionEffects.splice(i, 1);
    }
}

function drawEffects(ctx) {
    if (!ctx) return;
    for (const s of shockwaveEffects) {
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    for (const e of consumptionEffects) {
        ctx.save();
        ctx.globalAlpha = e.alpha;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * CONSUMPTION_INNER_RADIUS_RATIO, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 游戏帧计数器 ====================
let gameFrame = 0;

// ==================== 尘埃生成 ====================

function spawnDustFromCollision(x, y, vx, vy, totalMass, releaseRatio = 1.0, isDestruction = false) {
    if (totalMass <= 0 || state.dustParticles.length >= config.maxDustParticles) return;

    const dustMassTotal = totalMass * releaseRatio;
    const MIN_DUST_MASS = 0.3;
    const MAX_DUST_MASS = 1.5;
    const MAX_DUST_COUNT = 30;

    let targetCount = Math.min(MAX_DUST_COUNT, Math.max(1, Math.ceil(dustMassTotal / MAX_DUST_MASS)));

    let factors = [];
    for (let i = 0; i < targetCount; i++) {
        factors.push(0.6 + Math.random() * 0.8);
    }
    let sumFactors = factors.reduce((a, b) => a + b, 0);
    let masses = factors.map(f => f * dustMassTotal / sumFactors);

    let iteration = 0;
    const MAX_ITER = 10;
    while (iteration < MAX_ITER) {
        let needsAdjust = false;
        for (let i = 0; i < masses.length; i++) {
            if (masses[i] > MAX_DUST_MASS) {
                let excess = masses[i] - MAX_DUST_MASS;
                masses[i] = MAX_DUST_MASS;
                let others = masses.filter((_, idx) => idx !== i);
                if (others.length > 0) {
                    let share = excess / others.length;
                    for (let j = 0; j < masses.length; j++) {
                        if (j !== i) masses[j] += share;
                    }
                }
                needsAdjust = true;
            }
        }
        for (let i = 0; i < masses.length; i++) {
            if (masses[i] < MIN_DUST_MASS) {
                let deficit = MIN_DUST_MASS - masses[i];
                masses[i] = MIN_DUST_MASS;
                let others = masses.filter((_, idx) => idx !== i);
                if (others.length > 0) {
                    let share = deficit / others.length;
                    for (let j = 0; j < masses.length; j++) {
                        if (j !== i) {
                            masses[j] -= share;
                            if (masses[j] < MIN_DUST_MASS) masses[j] = MIN_DUST_MASS;
                        }
                    }
                }
                needsAdjust = true;
            }
        }
        if (!needsAdjust) break;
        iteration++;
    }

    let finalSum = masses.reduce((a, b) => a + b, 0);
    if (Math.abs(finalSum - dustMassTotal) > 0.01) {
        masses[0] += dustMassTotal - finalSum;
    }

    for (let i = 0; i < masses.length; i++) {
        if (state.dustParticles.length >= config.maxDustParticles) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.hypot(vx, vy) * 0.5 + Math.random() * 2;
        const dvx = Math.cos(angle) * speed;
        const dvy = Math.sin(angle) * speed;

        const mass = masses[i];
        const particle = new DustParticle(x, y, vx + dvx, vy + dvy, mass);
        particle.protectedUntilFrame = gameFrame + PROTECTION_DURATION_FRAMES; // 保护期内禁止合并和被吞噬
        state.dustParticles.push(particle);
    }

    if (isDestruction) {
        addLog(`手动摧毁产生 ${masses.length} 个尘埃粒子，总质量 ${dustMassTotal.toFixed(2)} (100%释放)`, 'info');
    }
}

// ==================== 碰撞处理 ====================

function handleMeteorCollisions() {
    const meteors = state.meteors;
    for (let i = 0; i < meteors.length; i++) {
        const a = meteors[i];
        if (a.consumed || a.removed) continue;
        for (let j = i + 1; j < meteors.length; j++) {
            const b = meteors[j];
            if (b.consumed || b.removed) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            const minDist = (a.radius + b.radius) * 0.9;
            if (dist < minDist) {
                const massRatio = a.mass > b.mass ? a.mass / b.mass : b.mass / a.mass;
                if (massRatio > 1.2) {
                    if (a.mass > b.mass) {
                        const absorbedMass = b.mass * ABSORPTION_RATIO;
                        const dustMass = b.mass - absorbedMass;
                        a.mass += absorbedMass;
                        a.radius = Math.sqrt(a.mass / 1.5);
                        createShockwave((a.x + b.x) / 2, (a.y + b.y) / 2, a.color);
                        spawnDustFromCollision(b.x, b.y, b.vx, b.vy, dustMass, 1.0);
                        b.consumed = true;
                        if (typeof updateMeteorInList === 'function') updateMeteorInList(b);
                        meteors.splice(j, 1);
                        j--;
                        addLog(`流星 #${a.listId || '?'} 吞噬 #${b.listId || '?'} (吸收 ${absorbedMass.toFixed(2)}，释放 ${dustMass.toFixed(2)})`, 'info');
                    } else {
                        const absorbedMass = a.mass * ABSORPTION_RATIO;
                        const dustMass = a.mass - absorbedMass;
                        b.mass += absorbedMass;
                        b.radius = Math.sqrt(b.mass / 1.5);
                        createShockwave((a.x + b.x) / 2, (a.y + b.y) / 2, b.color);
                        spawnDustFromCollision(a.x, a.y, a.vx, a.vy, dustMass, 1.0);
                        a.consumed = true;
                        if (typeof updateMeteorInList === 'function') updateMeteorInList(a);
                        meteors.splice(i, 1);
                        i--;
                        break;
                    }
                } else {
                    const totalMass = a.mass + b.mass;
                    createShockwave((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffff');
                    spawnDustFromCollision((a.x + b.x) / 2, (a.y + b.y) / 2,
                                         (a.vx + b.vx) / 2, (a.vy + b.vy) / 2, totalMass, ANNIHILATION_RATIO);
                    a.consumed = true;
                    b.consumed = true;
                    if (typeof updateMeteorInList === 'function') {
                        updateMeteorInList(a);
                        updateMeteorInList(b);
                    }
                    meteors.splice(j, 1);
                    meteors.splice(i, 1);
                    i--;
                    break;
                }
            }
        }
    }
}

function handleDustMeteorCollisions() {
    const meteors = state.meteors;
    const dust = state.dustParticles;

    for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        if (d.consumed) continue;

        // 检查保护期：只有过了保护期的尘埃才能被流星吞噬
        if (d.protectedUntilFrame > gameFrame) continue;

        for (let j = 0; j < meteors.length; j++) {
            const m = meteors[j];
            if (m.consumed || m.removed) continue;

            const dx = m.x - d.x;
            const dy = m.y - d.y;
            const dist = Math.hypot(dx, dy);
            const threshold = m.radius + d.radius;

            if (dist < threshold) {
                const absorbedMass = d.mass * 0.8;
                m.mass += absorbedMass;
                m.radius = Math.sqrt(m.mass / 1.5);
                addLog(`流星 #${m.listId || '?'} 吸收尘埃，质量 +${absorbedMass.toFixed(2)} (80%吸收)`, 'debug');
                d.consumed = true;
                dust.splice(i, 1);
                break;
            }
        }
    }
}

function handleDustCollisions() {
    const dust = state.dustParticles;
    if (dust.length < 2) return;

    const GRID_SIZE = 60;

    const grid = new Map();
    for (let i = 0; i < dust.length; i++) {
        const d = dust[i];
        if (d.consumed) continue;
        const gx = Math.floor(d.x / GRID_SIZE);
        const gy = Math.floor(d.y / GRID_SIZE);
        const key = `${gx},${gy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push({ index: i, particle: d });
    }

    const processedPairs = new Set();

    for (const [key, cell] of grid.entries()) {
        const [gx, gy] = key.split(',').map(Number);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nKey = `${gx + dx},${gy + dy}`;
                const neighborCell = grid.get(nKey);
                if (!neighborCell) continue;

                for (const aInfo of cell) {
                    const a = aInfo.particle;
                    if (a.consumed) continue;
                    for (const bInfo of neighborCell) {
                        const b = bInfo.particle;
                        if (b === a || b.consumed) continue;

                        const pairId = aInfo.index < bInfo.index ? `${aInfo.index},${bInfo.index}` : `${bInfo.index},${aInfo.index}`;
                        if (processedPairs.has(pairId)) continue;
                        processedPairs.add(pairId);

                        // 检查保护期：两个尘埃都过了保护期才能合并
                        if (a.protectedUntilFrame > gameFrame || b.protectedUntilFrame > gameFrame) continue;

                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const dist = Math.hypot(dx, dy);
                        const minDist = (a.radius + b.radius) * 0.8;

                        if (dist < minDist) {
                            if (a.mass >= b.mass) {
                                a.mass += b.mass;
                                a.radius = 1 + a.mass * 0.5;
                                b.consumed = true;
                            } else {
                                b.mass += a.mass;
                                b.radius = 1 + b.mass * 0.5;
                                a.consumed = true;
                            }
                        }
                    }
                }
            }
        }
    }

    state.dustParticles = dust.filter(d => !d.consumed);
}

function convertDustToMeteors() {
    const dust = state.dustParticles;
    const meteors = state.meteors;

    for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        if (d.consumed) continue;

        // 只检查质量，不检查保护期（允许立即转化）
        if (d.mass > DUST_TO_METEOR_THRESHOLD) {
            const dustData = {
                x: d.x, y: d.y, vx: d.vx, vy: d.vy, mass: d.mass, createdAt: Date.now()
            };
            const newMeteor = new Meteor(false, null, null, dustData);
            meteors.push(newMeteor);
            addLog(`尘埃质量 ${d.mass.toFixed(2)} 转化为流星 #${newMeteor.listId} (保持原速度和质量)`, 'info');
            d.consumed = true;
            dust.splice(i, 1);
        }
    }
}

function physicsUpdate() {
    gameFrame++; // 每物理更新一帧，帧计数增加
    applyAllGravity();
    handleMeteorCollisions();
    handleDustMeteorCollisions();
    handleDustCollisions();
    convertDustToMeteors();
}

function destroyMeteor(meteor) {
    if (!meteor || meteor.consumed || meteor.removed) return;
    const x = meteor.x, y = meteor.y;
    const vx = meteor.vx, vy = meteor.vy;
    const totalMass = meteor.mass;
    meteor.consumed = true;
    if (typeof updateMeteorInList === 'function') updateMeteorInList(meteor);
    const index = state.meteors.indexOf(meteor);
    if (index !== -1) state.meteors.splice(index, 1);
    spawnDustFromCollision(x, y, vx, vy, totalMass, DESTROY_RELEASE_RATIO, true);
    createShockwave(x, y, '#ffaa55');
    const id = meteor.listId ? `#${meteor.listId}` : '(无ID)';
    addLog(`流星 ${id} 被手动摧毁，释放质量 ${totalMass.toFixed(2)} (100%释放)`, 'warning');
}

function detonateAllMeteors() {
    const currentMeteors = [...state.meteors];
    let count = 0;
    for (const meteor of currentMeteors) {
        if (!meteor.consumed && !meteor.removed) {
            destroyMeteor(meteor);
            count++;
        }
    }
    addLog(`引爆所有流星，共摧毁 ${count} 个流星`, 'warning');
}

module.exports = {
    physicsUpdate,
    destroyMeteor,
    detonateAllMeteors,
    updateEffects,
    drawEffects,
};
