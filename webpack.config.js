const path = require('path');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        mode: isProduction ? 'production' : 'development',
        entry: './code/JS/main.js',
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        optimization: {
            // 开发模式下不压缩，保留可读性
            minimize: false,
            // 启用 tree shaking
            usedExports: true,
            // 仅在 production 模式下启用代码分割（避免多 chunk 冲突）
            splitChunks: isProduction ? {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    },
                },
            } : false,
        },
        // 开发时使用 eval-source-map 保证快速重建和精确报错
        devtool: 'eval-source-map',
        watchOptions: {
            ignored: /node_modules/,
        },
        resolve: {
            extensions: ['.js'],
        },
        performance: {
            hints: false, // 开发阶段不提示性能警告
        },
    };
};
