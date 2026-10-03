'use strict';

var logger = require('../utils/logger');
var initSPAListener = require('../utils/spaListener');

module.exports = function (settings) {
    var extensionSettings = turbine.getExtensionSettings();
    var pixelId = extensionSettings.pixelId;
    var autoPageView = extensionSettings.autoPageView !== false;
    var debugMode = !!extensionSettings.debugMode;

    if (!pixelId) {
        turbine.logger.warn('[TikTok Pixel] Pixel ID is missing from extension settings.');
        return Promise.resolve();
    }

    return new Promise(function (resolve) {
        // 1. Define base ttq stub
        !function (w, d, t) {
            w[t] = w[t] || [];
            var o = w[t];
            o.methods = [
                'page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
                'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'
            ];
            o.setAndDefer = function (t, e) {
                t[e] = function () {
                    t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
                };
            };
            for (var i = 0; i < o.methods.length; i++) {
                o.setAndDefer(o, o.methods[i]);
            }
            o.instance = function (t) {
                for (var e = o._i[t] || [], n = 0; n < o.methods.length; n++) {
                    o.setAndDefer(e, o.methods[n]);
                }
                return e;
            };
            o.load = function (e, n) {
                var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
                o._i = o._i || {};
                o._i[e] = [];
                o._i[e]._u = i;
                o._t = o._t || {};
                o._t[e] = +new Date();
                o._o = o._o || {};
                o._o[e] = n || {};
                var c = document.createElement('script');
                c.type = 'text/javascript';
                c.async = true;
                c.src = i + '?sdkid=' + e + '&lib=' + t;
                var a = document.getElementsByTagName('script')[0];

                c.onload = function () {
                    window.__ttq_loaded = true;
                    if (debugMode) logger.log('SDK Script loaded successfully.');
                    resolve();
                };

                c.onerror = function () {
                    window.__ttq_failed = true;
                    turbine.logger.warn('[TikTok Pixel] SDK script failed to load from CDN.');
                    resolve();
                };

                a.parentNode.insertBefore(c, a);
            };
        }(window, document, 'ttq');

        // 2. Timeout resiliency check (5s)
        setTimeout(function () {
            if (!window.__ttq_loaded && !window.__ttq_failed) {
                window.__ttq_failed = true;
                turbine.logger.warn('[TikTok Pixel] Library load timeout (5s) reached. Proceeding with fallback.');
                resolve();
            }
        }, 5000);

        // 3. Initialize SDK Instance
        try {
            window.ttq.load(pixelId);

            if (debugMode) {
                window.ttq.debug();
                logger.log('ttq.debug() initialized for Pixel ID:', pixelId);
                logger.updateDebugBadge('SDK Loaded', 'OK');
            }

            if (autoPageView) {
                window.ttq.page();
                if (debugMode) logger.log('Auto PageView fired.');
            }

            // 4. Initialize Single Page Application listener
            initSPAListener(function (newUrl) {
                if (autoPageView && !window.__ttq_failed) {
                    window.ttq.page();
                    if (debugMode) {
                        logger.log('SPA PageView auto-fired for URL:', newUrl);
                        logger.updateDebugBadge('PageView (SPA)', 'OK');
                    }
                }
            });

        } catch (err) {
            turbine.logger.error('[TikTok Pixel] Error initializing base SDK script: ' + err.message);
            resolve();
        }
    });
};