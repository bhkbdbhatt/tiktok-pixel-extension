'use strict';

var logger = require('../utils/logger');

module.exports = function () {
    var extSettings = turbine.getExtensionSettings();
    var debugMode = !!extSettings.debugMode;

    if (window.__ttq_failed) return Promise.resolve();

    try {
        if (window.ttq && typeof window.ttq.page === 'function') {
            window.ttq.page();
            if (debugMode) {
                logger.log('Manual SPA PageView tracked.');
                logger.updateDebugBadge('PageView (SPA)', 'OK');
            }
        }
    } catch (err) {
        turbine.logger.error('[TikTok Pixel] Track PageView SPA error: ' + err.message);
    }

    return Promise.resolve();
};