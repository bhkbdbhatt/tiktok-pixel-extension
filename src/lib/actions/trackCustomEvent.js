'use strict';

var logger = require('../utils/logger');

module.exports = function (settings, event) {
    var extSettings = turbine.getExtensionSettings();
    var debugMode = !!extSettings.debugMode;

    if (window.__ttq_failed) return Promise.resolve();

    var customEventName = settings.customEventName;
    if (!customEventName) {
        turbine.logger.warn('[TikTok Pixel] Custom Event Name is required.');
        return Promise.resolve();
    }

    var params = {};
    var customParamsRaw = turbine.getDataElementValue('customParams', event);

    if (customParamsRaw) {
        try {
            params = typeof customParamsRaw === 'string' ? JSON.parse(customParamsRaw) : customParamsRaw;
        } catch (e) {
            turbine.logger.warn('[TikTok Pixel] Invalid customParams JSON string: ' + e.message);
        }
    }

    try {
        if (window.ttq && typeof window.ttq.track === 'function') {
            window.ttq.track(customEventName, params);
            if (debugMode) {
                logger.log('Custom Event Tracked: ' + customEventName, params);
                logger.updateDebugBadge(customEventName, 'OK');
            }
        }
    } catch (err) {
        turbine.logger.error('[TikTok Pixel] Track Custom Event error: ' + err.message);
    }

    return Promise.resolve();
};