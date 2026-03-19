// code/JS/constants.js

// ========== 引力常数 ==========
/** 黑洞引力缩放因子 */
const GRAVITY_CONSTANT = 0.001;

/** 流星对尘埃的引力系数 */
const METEOR_GRAVITY_FACTOR = 0.00001;

/** 流星之间的引力系数 */
const METEOR_METEOR_GRAVITY_FACTOR = 0.0001;

/** 尘埃之间的引力系数 */
const DUST_DUST_GRAVITY_FACTOR = 0.001;

/** 吞噬时吸收的质量比例（流星吞噬时吸收50%，剩余50%转化为尘埃） */
const ABSORPTION_RATIO = 0.5;

/** 质量相近湮灭时，100%转化为尘埃 */
const ANNIHILATION_RATIO = 1.0;

/** 手动摧毁流星时，100%释放为尘埃 */
const DESTROY_RELEASE_RATIO = 1.0;

// ========== 尘埃系统常量 ==========
/** 新生成尘埃的保护帧数（在60fps下对应约2秒） */
const PROTECTION_DURATION_FRAMES = 120;

/** 尘埃质量超过此值转化为流星（转化时保持原质量） */
const DUST_TO_METEOR_THRESHOLD = 5.0;

// ========== 日志系统常量 ==========
/** 日志最大保留条数 */
const MAX_LOGS = 100;

// ========== 其他常量 ==========
/** 帧率采样窗口大小 */
const MAX_FRAME_TIME_SAMPLES = 60;

/** 流星历史记录最大长度 */
const MAX_METEOR_HISTORY = 50;

/** 流星从列表中移除的延迟时间（毫秒） */
const REMOVAL_DELAY = 5000;

module.exports = {
    GRAVITY_CONSTANT,
    METEOR_GRAVITY_FACTOR,
    METEOR_METEOR_GRAVITY_FACTOR,
    DUST_DUST_GRAVITY_FACTOR,
    ABSORPTION_RATIO,
    ANNIHILATION_RATIO,
    DESTROY_RELEASE_RATIO,
    PROTECTION_DURATION_FRAMES,
    DUST_TO_METEOR_THRESHOLD,
    MAX_LOGS,
    MAX_FRAME_TIME_SAMPLES,
    MAX_METEOR_HISTORY,
    REMOVAL_DELAY
};
