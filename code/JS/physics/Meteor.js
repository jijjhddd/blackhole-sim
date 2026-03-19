// code/JS/physics/Meteor.js

const state = require('../state.js');
const config = require('../config.js');
const { addLog } = require('../utils/logger.js');
const meteorDataCore = require('../data/MeteorDataCore.js');
const addMeteorToList = meteorDataCore.addMeteorToList;
const updateMeteorInList = meteorDataCore.updateMeteorInList;
const markMeteorAsRemoved = meteorDataCore.markMeteorAsRemoved;

// 从全局对象获取吞噬特效函数（由 engine 挂载）
const createConsumptionEffect = global.createConsumptionEffect || function(x, y, color) {};

class Meteor {
    /**
     * 创建一个流星
     * @param {boolean} isManual 是否手动放置
     * @param {number|null} x 指定x坐标
     * @param {number|null} y 指定y坐标
     * @param {Object|null} dustData 尘埃数据（用于转化时）
     */
    constructor(isManual = false, x = null, y = null, dustData = null) {
        this.manual = isManual;
        
        this.color = this.getRandomColor();
        this.speed = config.meteorSpeedBase * (Math.random() * 0.5 + 0.75);
        this.trail = [];
        this.maxTrailLength = config.trailLength;
        this.consumed = false;
        this.removed = false;
        
        if (dustData !== null) {
            this.x = dustData.x;
            this.y = dustData.y;
            this.vx = dustData.vx;
            this.vy = dustData.vy;
            this.mass = dustData.mass;
            // 修复：半径与质量的关系，使用平方根并适当缩放，使常见质量（如10）的半径约5-6
            this.radius = Math.max(3, Math.sqrt(this.mass) * 1.8); // 质量10 -> 半径约5.7
            this.createdAt = dustData.createdAt || Date.now();
        } else {
            // 正常随机生成
            this.radius = 4 + Math.random() * (config.meteorMaxSize - 3);
            const massFactor = 0.8 + Math.random() * 0.4;
            // 质量与半径平方成正比，调整系数使合理
            this.mass = this.radius * this.radius * 0.4 * massFactor; // 半径10时质量约40
            this.vx = 0;
            this.vy = 0;
            this.createdAt = Date.now();
            this.reset(isManual, x, y);
        }
        
        this.vertices = this.generateVertices();
        this.listId = null;

        if (typeof addMeteorToList === 'function') {
            const meteorInfo = addMeteorToList(this);
            if (meteorInfo && meteorInfo.id) {
                this.listId = meteorInfo.id;
            }
        }
        
        if (dustData !== null) {
            addLog(`尘埃转化流星 #${this.listId || '?'} (质量: ${this.mass.toFixed(2)}, 半径: ${this.radius.toFixed(2)})`, 'info');
        } else {
            addLog(`创建流星 #${this.listId || '?'} (速度: ${this.speed.toFixed(2)}, 质量: ${this.mass.toFixed(2)}, 半径: ${this.radius.toFixed(2)})`, 'info');
        }
    }

    getRandomColor() {
        const colors = ['#ff5555', '#55aaff', '#55ffaa', '#ffaa55', '#aa55ff', '#ffff55'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    generateVertices() {
        const numPoints = 8 + Math.floor(Math.random() * 5);
        const vertices = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const radScale = 0.7 + Math.random() * 0.6;
            const r = this.radius * radScale;
            vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        return vertices;
    }

    reset(isManual, manualX, manualY) {
        const canvas = state.canvas;
        const bh = state.blackHole;
        if (!canvas) return;
        
        if (manualX !== null && manualY !== null) {
            this.x = manualX;
            this.y = manualY;
        } else {
            const side = Math.floor(Math.random() * 4);
            switch(side) {
                case 0: this.x = Math.random() * canvas.width; this.y = -10; break;
                case 1: this.x = canvas.width + 10; this.y = Math.random() * canvas.height; break;
                case 2: this.x = Math.random() * canvas.width; this.y = canvas.height + 10; break;
                case 3: this.x = -10; this.y = Math.random() * canvas.height; break;
            }
        }

        if (isManual && manualX !== null && manualY !== null) {
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
        } else if (manualX === null || manualY === null) {
            const dx = bh.x - this.x;
            const dy = bh.y - this.y;
            const angleToBH = Math.atan2(dy, dx);
            const randomAngle = angleToBH + (Math.random() - 0.5) * Math.PI / 2;
            this.vx = Math.cos(randomAngle) * this.speed;
            this.vy = Math.sin(randomAngle) * this.speed;
        }
        
        if (isNaN(this.x) || isNaN(this.y) || isNaN(this.vx) || isNaN(this.vy)) {
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            this.vx = 0;
            this.vy = 0;
        }
    }

    update() {
        if (this.consumed || this.removed) return;

        const bh = state.blackHole;
        const canvas = state.canvas;
        
        if (!canvas || !bh) return;
        if (isNaN(this.x) || isNaN(this.y) || isNaN(this.vx) || isNaN(this.vy)) {
            this.consumed = true;
            return;
        }

        if (config.showTrails) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrailLength) this.trail.shift();
        }

        const dx = bh.x - this.x;
        const dy = bh.y - this.y;
        const distToBH = Math.hypot(dx, dy);
        
        // 黑洞吞噬
        if (distToBH < bh.radius) {
            this.consumed = true;
            if (typeof createConsumptionEffect === 'function') {
                createConsumptionEffect(this.x, this.y, this.color);
            }
            if (typeof updateMeteorInList === 'function') {
                updateMeteorInList(this);
            }
            return;
        }

        this.x += this.vx;
        this.y += this.vy;

        const outOfBounds = this.x < -50 || this.x > canvas.width + 50 || 
                           this.y < -50 || this.y > canvas.height + 50;
        
        if (outOfBounds) {
            if (config.boundaryMode === 'remove') {
                this.removed = true;
                if (typeof markMeteorAsRemoved === 'function') {
                    markMeteorAsRemoved(this);
                }
                addLog(`流星 #${this.listId || '?'} 飞出边界，已移除`, 'info');
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
                addLog(`流星 #${this.listId || '?'} 反弹`, 'debug');
            }
        }

        if (typeof updateMeteorInList === 'function') {
            updateMeteorInList(this);
        }
    }

    draw() {
        if (this.consumed || this.removed) return;
        if (isNaN(this.x) || isNaN(this.y)) return;
        
        const ctx = state.ctx;
        if (!ctx) return;

        if (config.showTrails && this.trail.length > 1) {
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                if (!isNaN(this.trail[i].x) && !isNaN(this.trail[i].y)) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
            }
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.stroke();

            for (let i = 0; i < this.trail.length; i++) {
                const p = this.trail[i];
                if (isNaN(p.x) || isNaN(p.y)) continue;
                const alpha = i / this.trail.length;
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.radius * alpha * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = alpha * 0.3;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        if (isNaN(this.x) || isNaN(this.y)) return;
        
        ctx.beginPath();
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            const wx = this.x + v.x;
            const wy = this.y + v.y;
            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

module.exports = Meteor;
