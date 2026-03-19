// code/JS/physics/DustParticle.js

const state = require('../state.js');
const config = require('../config.js');

class DustParticle {
    /**
     * 创建一个尘埃粒子
     * @param {number} x 初始X坐标
     * @param {number} y 初始Y坐标
     * @param {number} vx X方向速度
     * @param {number} vy Y方向速度
     * @param {number} mass 质量
     */
    constructor(x, y, vx = 0, vy = 0, mass = 0.5) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mass = mass;
        this.radius = 1 + mass * 0.5;          // 视觉大小随质量增加
        this.color = '#aaaaaa';                  // 尘埃颜色
        this.consumed = false;                    // 是否已被消耗
        this.protectedUntilFrame = 0;              // 保护截止帧数（游戏帧）
    }

    /**
     * 更新尘埃粒子位置和状态
     * 注意：引力已由外部函数计算，此处只负责移动、边界处理和吞噬检测
     */
    update() {
        if (this.consumed) return;

        const bh = state.blackHole;
        const canvas = state.canvas;

        // 检查是否被黑洞吞噬
        const dx = bh.x - this.x;
        const dy = bh.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < bh.radius) {
            this.consumed = true;
            return;
        }

        // 移动
        this.x += this.vx;
        this.y += this.vy;

        // 边界处理
        const outOfBounds = this.x < -50 || this.x > canvas.width + 50 || 
                           this.y < -50 || this.y > canvas.height + 50;
        
        if (outOfBounds) {
            if (config.boundaryMode === 'remove') {
                this.consumed = true;
            } else if (config.boundaryMode === 'bounce') {
                if (this.x < 0) { 
                    this.x = 0; 
                    this.vx = Math.abs(this.vx) * 0.8; 
                }
                else if (this.x > canvas.width) { 
                    this.x = canvas.width; 
                    this.vx = -Math.abs(this.vx) * 0.8; 
                }
                if (this.y < 0) { 
                    this.y = 0; 
                    this.vy = Math.abs(this.vy) * 0.8; 
                }
                else if (this.y > canvas.height) { 
                    this.y = canvas.height; 
                    this.vy = -Math.abs(this.vy) * 0.8; 
                }
            }
            // ignore 模式不做处理
        }
    }

    /**
     * 绘制尘埃粒子
     */
    draw() {
        if (this.consumed) return;
        
        const ctx = state.ctx;
        if (!ctx) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

module.exports = DustParticle;
