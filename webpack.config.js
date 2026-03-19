const path = require('path');

module.exports = {
    mode: 'development', // 开发模式，便于调试
    entry: './code/JS/main.js', // 入口文件
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.css$/, // 处理 CSS 文件
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    devtool: 'source-map', // 生成 source map，方便调试
};