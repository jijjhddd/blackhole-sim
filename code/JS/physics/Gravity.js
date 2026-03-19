// code/JS/physics/Gravity.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');
const {
    GRAVITY_CONSTANT,
    METEOR_METEOR_GRAVITY_FACTOR,
    DUST_DUST_GRAVITY_FACTOR,
    METEOR_GRAVITY_FACTOR
} = require('../constants.js');

/**
 * 黑洞对单个物体的引力（直接修改物体速度）
 */
function applyBlackHoleGravity(obj) {
    const bh = state.blackHole;
    const dx = bh.x - obj.x;
    const dy = bh.y - obj.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bh.radius) return; // 吞噬由调用者处理
    const safeDist = Math.max(dist, config.minGravityDistance);
    const gravity = config.blackHoleStrength * GRAVITY_CONSTANT / Math.pow(safeDist, config.gravityFalloff);
    const ax = (dx / safeDist) * gravity;
    const ay = (dy / safeDist) * gravity;
    
    // 记录引力大小（调试用）
    if (gravity > 0.1 && Math.random() < 0.01) { // 1%概率记录，避免刷屏
        addLog(`黑洞引力: dist=${dist.toFixed(1)}, gravity=${gravity.toFixed(3)}`, 'debug');
    }
    
    obj.vx += ax;
    obj.vy += ay;
}

/**
 * 对每个流星应用黑洞引力
 */
function applyBlackHoleToMeteors(meteors) {
    for (const m of meteors) {
        if (!m.consumed) {
            applyBlackHoleGravity(m);
        }
    }
}

/**
 * 对每个尘埃应用黑洞引力
 */
function applyBlackHoleToDust(dust) {
    for (const d of dust) {
        if (!d.consumed) {
            applyBlackHoleGravity(d);
        }
    }
}

/**
 * 流星之间的相互引力
 */
function applyMeteorGravity(meteors) {
    if (meteors.length < 2) return;
    
    for (let i = 0; i < meteors.length; i++) {
        const a = meteors[i];
        if (a.consumed) continue;
        for (let j = i + 1; j < meteors.length; j++) {
            const b = meteors[j];
            if (b.consumed) continue;
            
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1) continue;
            
            const force = METEOR_METEOR_GRAVITY_FACTOR * a.mass * b.mass / (dist * dist);
            const ax = (dx / dist) * force / a.mass;
            const ay = (dy / dist) * force / a.mass;
            
            a.vx += ax;
            a.vy += ay;
            b.vx -= ax;
            b.vy -= ay;
        }
    }
}

/**
 * 尘埃之间的相互引力（网格优化）
 */
function applyDustGravity(dustParticles) {
    if (dustParticles.length < 2) return;

    const GRID_SIZE = 80; // 网格大小（像素）
    const grid = new Map();

    // 构建网格
    for (let i = 0; i < dustParticles.length; i++) {
        const d = dustParticles[i];
        if (d.consumed) continue;
        const gx = Math.floor(d.x / GRID_SIZE);
        const gy = Math.floor(d.y / GRID_SIZE);
        const key = `${gx},${gy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push({ index: i, particle: d });
    }

    // 遍历每个网格及其相邻网格
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

                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist < 1) continue;

                        const force = DUST_DUST_GRAVITY_FACTOR * a.mass * b.mass / (dist * dist);
                        const ax = (dx / dist) * force / a.mass;
                        const ay = (dy / dist) * force / a.mass;
                        a.vx += ax;
                        a.vy += ay;
                        b.vx -= ax;
                        b.vy -= ay;
                    }
                }
            }
        }
    }
}

/**
 * 流星对尘埃的引力
 */
function applyMeteorOnDustGravity(meteors, dustParticles) {
    if (meteors.length === 0 || dustParticles.length === 0) return;
    
    for (const m of meteors) {
        if (m.consumed) continue;
        for (const d of dustParticles) {
            if (d.consumed) continue;
            
            const dx = m.x - d.x;
            const dy = m.y - d.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1) continue;
            
            const force = METEOR_GRAVITY_FACTOR * m.mass * d.mass / (dist * dist);
            const ax = (dx / dist) * force / d.mass;
            const ay = (dy / dist) * force / d.mass;
            d.vx += ax;
            d.vy += ay;
        }
    }
}

/**
 * 主引力函数 - 在 physicsUpdate 中调用
 */
function applyAllGravity() {
    const meteors = state.meteors;
    const dust = state.dustParticles;
    
    // 记录引力计算前的速度（调试用）
    if (meteors.length > 0 && Math.random() < 0.01) {
        const sample = meteors[0];
        addLog(`引力前: vx=${sample.vx.toFixed(3)}, vy=${sample.vy.toFixed(3)}`, 'debug');
    }
    
    // 黑洞引力（对流星和尘埃）
    applyBlackHoleToMeteors(meteors);
    applyBlackHoleToDust(dust);
    
    // 流星之间的引力
    applyMeteorGravity(meteors);
    
    // 尘埃之间的引力
    applyDustGravity(dust);
    
    // 流星对尘埃的引力
    applyMeteorOnDustGravity(meteors, dust);
    
    // 记录引力计算后的速度（调试用）
    if (meteors.length > 0 && Math.random() < 0.01) {
        const sample = meteors[0];
        addLog(`引力后: vx=${sample.vx.toFixed(3)}, vy=${sample.vy.toFixed(3)}`, 'debug');
    }
}

module.exports = {
    applyAllGravity,
    applyBlackHoleGravity,
    applyMeteorGravity,
    applyDustGravity,
    applyMeteorOnDustGravity
};
