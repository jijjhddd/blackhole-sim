// code/JS/ui/Renderer.js

const state = require('../state.js');
const config = require('../config.js');

/**
 * 渲染器模块 - 负责所有绘制操作
 * 支持摄像机偏移和缩放
 */
const Renderer = {
    /**
     * 应用摄像机变换
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Camera} camera 
     */
    applyCameraTransform(ctx, camera) {
        if (camera) {
            ctx.translate(-camera.offsetX, -camera.offsetY);
            ctx.scale(camera.scale, camera.scale);
        }
    },

    /**
     * 绘制黑洞
     */
    drawBlackHole(ctx, camera) {
        const bh = state.blackHole;
        if (!ctx || !bh) return;
        
        ctx.save();
        if (camera) {
            ctx.translate(-camera.offsetX, -camera.offsetY);
            ctx.scale(camera.scale, camera.scale);
        }

        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(bh.x, bh.y, bh.radius, bh.x, bh.y, bh.radius * 2);
        gradient.addColorStop(0, 'rgba(138,43,226,0.8)');
        gradient.addColorStop(0.3, 'rgba(0,191,255,0.5)');
        gradient.addColorStop(0.7, 'rgba(255,69,0,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        if (config.showGravitationalLens) {
            for (let i = 0; i < 3; i++) {
                const r = bh.radius * 2 + i * 20;
                ctx.beginPath();
                ctx.arc(bh.x, bh.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - i / 3)})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        if (config.showSafetyZone) {
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, config.safetyZoneRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0,255,0,0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (config.showEventHorizon) {
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    },

    /**
     * 绘制背景星星
     */
    drawStars(ctx, starsArray, camera) {
        if (!ctx || !starsArray) return;
        
        ctx.save();
        if (camera) {
            ctx.translate(-camera.offsetX, -camera.offsetY);
            ctx.scale(camera.scale, camera.scale);
        }

        for (const s of starsArray) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${s.brightness})`;
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * 绘制流星
     */
    drawMeteors(meteors, camera) {
        const ctx = state.ctx;
        if (!ctx) return;
        
        ctx.save();
        if (camera) {
            ctx.translate(-camera.offsetX, -camera.offsetY);
            ctx.scale(camera.scale, camera.scale);
        }

        for (const m of meteors) {
            if (m.draw && typeof m.draw === 'function') {
                m.draw();
            }
        }

        ctx.restore();
    },

    /**
     * 绘制尘埃
     */
    drawDust(dustParticles, camera) {
        const ctx = state.ctx;
        if (!ctx) return;
        
        ctx.save();
        if (camera) {
            ctx.translate(-camera.offsetX, -camera.offsetY);
            ctx.scale(camera.scale, camera.scale);
        }

        for (const d of dustParticles) {
            if (d.draw && typeof d.draw === 'function') {
                d.draw();
            }
        }

        ctx.restore();
    },

    /**
     * 绘制调试信息（屏幕坐标系，不受摄像机影响）
     */
    drawDebugInfo(ctx, stats) {
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#a0c8ff';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${stats.fps}`, 10, 20);
        ctx.fillText(`流星: ${stats.meteorCount}`, 10, 40);
        ctx.fillText(`尘埃: ${stats.dustCount}`, 10, 60);
        if (window.observationMode) {
            ctx.fillStyle = '#ffaa55';
            ctx.fillText('观察模式', 10, 80);
        }
        ctx.restore();
    },

    /**
     * 清空画布
     */
    clear(ctx, width, height) {
        if (ctx) {
            ctx.clearRect(0, 0, width, height);
        }
    }
};

module.exports = Renderer;
