// code/JS/state.js

// 画布和上下文（由 main.js 设置）
let canvas = null;
let ctx = null;

// 黑洞对象
const blackHole = {
    x: 0,
    y: 0,
    radius: 30,
    accretionDiskRadius: 60,
    spin: 0
};

// 流星和尘埃数组
let meteors = [];
let dustParticles = [];

// 导出所有需要共享的变量和设置函数
module.exports = {
    // 获取画布和上下文
    get canvas() { return canvas; },
    get ctx() { return ctx; },
    setCanvas: (c) => { canvas = c; },
    setCtx: (c) => { ctx = c; },

    // 黑洞对象（直接导出引用，外部可修改其属性）
    blackHole,

    // 流星和尘埃数组（直接导出引用）
    meteors,
    dustParticles,
};
