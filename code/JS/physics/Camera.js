/**
 * 摄像机模块
 * 管理视图偏移和缩放
 */
class Camera {
    constructor() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.smoothing = 0.1;
        this.followingMeteorId = null;
        this.scale = 1.0; // 新增缩放属性
        this.targetScale = 1.0;
    }

    /**
     * 设置摄像机偏移（立即）
     */
    setOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
        this.targetOffsetX = x;
        this.targetOffsetY = y;
    }

    /**
     * 平滑移动摄像机到目标位置
     */
    moveTo(x, y) {
        this.targetOffsetX = x;
        this.targetOffsetY = y;
        // 取消跟随
        this.followingMeteorId = null;
    }

    /**
     * 按增量移动摄像机
     */
    moveBy(dx, dy) {
        this.targetOffsetX += dx;
        this.targetOffsetY += dy;
        this.followingMeteorId = null;
    }

    /**
     * 设置缩放
     */
    setScale(scale) {
        this.targetScale = Math.max(0.2, Math.min(5.0, scale));
    }

    /**
     * 每帧更新平滑移动和缩放
     */
    update() {
        // 平滑移动
        this.offsetX += (this.targetOffsetX - this.offsetX) * this.smoothing;
        this.offsetY += (this.targetOffsetY - this.offsetY) * this.smoothing;
        if (Math.abs(this.targetOffsetX - this.offsetX) < 0.1) this.offsetX = this.targetOffsetX;
        if (Math.abs(this.targetOffsetY - this.offsetY) < 0.1) this.offsetY = this.targetOffsetY;

        // 平滑缩放
        this.scale += (this.targetScale - this.scale) * this.smoothing;
        if (Math.abs(this.targetScale - this.scale) < 0.01) this.scale = this.targetScale;
    }

    /**
     * 将世界坐标转换为屏幕坐标（考虑缩放）
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.offsetX) * this.scale,
            y: (worldY - this.offsetY) * this.scale
        };
    }

    /**
     * 将屏幕坐标转换为世界坐标（考虑缩放）
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX / this.scale + this.offsetX,
            y: screenY / this.scale + this.offsetY
        };
    }

    /**
     * 获取当前缩放值
     */
    getScale() {
        return this.scale;
    }

    /**
     * 聚焦到指定流星（称为跟随更合适）
     */
    followMeteor(meteor) {
        if (!meteor) return;
        const canvas = document.getElementById('blackHoleCanvas');
        if (!canvas) return;
        // 目标偏移：使流星位于画布中心
        const targetX = meteor.x - canvas.width / 2 / this.scale;
        const targetY = meteor.y - canvas.height / 2 / this.scale;
        this.moveTo(targetX, targetY);
        this.followingMeteorId = meteor.listId;
    }

    /**
     * 重置摄像机到原点（黑洞中心）
     */
    reset() {
        this.moveTo(0, 0);
        this.setScale(1.0);
        this.followingMeteorId = null;
    }
}

module.exports = Camera;
