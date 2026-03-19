// code/JS/utils/helpers.js

function formatScientificNotation(value) {
    return value.toExponential(1);
}

function getBoundaryModeText(mode) {
    switch(mode) {
        case 'remove': return '清除';
        case 'bounce': return '反弹';
        case 'ignore': return '不处理';
        default: return '清除';
    }
}

function getHeightLabel(height) {
    if (height <= 40) return "低";
    if (height <= 55) return "中";
    return "高";
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    });
}

module.exports = {
    formatScientificNotation,
    getBoundaryModeText,
    getHeightLabel,
    copyToClipboard,
};
