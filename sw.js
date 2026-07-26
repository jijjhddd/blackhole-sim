// sw.js - 改进版 Service Worker，实现合理的缓存策略

const CACHE_VERSION = 'v3';
const CACHE_NAME = `blackhole-sim-${CACHE_VERSION}`;

// 需要预缓存的静态资源列表
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/code/CSS/style.css',
    '/code/CSS/panel.css',
    '/dist/bundle.js',
    '/code/HTML/panel.html',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
    '/manifest.json'
];

// 安装阶段：预缓存静态资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] 预缓存静态资源');
                return cache.addAll(STATIC_ASSETS)
                    .catch(err => {
                        console.error('[SW] 预缓存失败:', err);
                        // 即使部分失败也继续，但记录错误
                    });
            })
            .then(() => self.skipWaiting())
    );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => {
                const deletePromises = keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key));
                return Promise.all(deletePromises);
            })
            .then(() => {
                console.log('[SW] 新缓存已激活，旧缓存已清理');
                return self.clients.claim();
            })
    );
});

// 请求拦截：实现缓存优先策略（静态资源）和网络优先（API）
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 如果是 API 请求，使用网络优先，不缓存
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // API 请求失败时返回简单的错误响应
                    return new Response(JSON.stringify({ error: '网络错误' }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // 如果是静态资源（CSS, JS, 图标等），使用缓存优先策略
    const isStatic = /\.(css|js|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$/.test(url.pathname);
    // 或者是 HTML 页面
    const isHtml = url.pathname === '/' || url.pathname === '/index.html';

    if (isStatic || isHtml) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        // 缓存命中，返回缓存
                        return cachedResponse;
                    }
                    // 否则发起网络请求并缓存结果
                    return fetch(event.request)
                        .then(response => {
                            // 只缓存成功的响应
                            if (!response || response.status !== 200) {
                                return response;
                            }
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(err => console.warn('[SW] 缓存写入失败:', err));
                            return response;
                        })
                        .catch(() => {
                            // 如果网络请求也失败，且是 HTML 请求，返回离线页面
                            if (isHtml) {
                                return caches.match('/index.html');
                            }
                            // 其他资源无法返回
                            return new Response('资源不可用', { status: 503 });
                        });
                })
        );
        return;
    }

    // 其他请求（如音频、视频等）直接走网络，不缓存
    event.respondWith(fetch(event.request));
});
