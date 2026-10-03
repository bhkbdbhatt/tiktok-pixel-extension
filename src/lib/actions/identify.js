'use strict';

var logger = require('../utils/logger');

module.exports = function (settings, event) {
    var extSettings = turbine.getExtensionSettings();
    var debugMode = !!extSettings.debugMode;

    if (window.__ttq_failed) return Promise.resolve();

    var email = turbine.getDataElementValue('email', event);
    var phone = turbine.getDataElementValue('phoneNumber', event);
    var externalId = turbine.getDataElementValue('externalId', event);

    var identifyData = {};
    if (email) identifyData.email = email;
    if (phone) identifyData.phone_number = phone;
    if (externalId) identifyData.external_id = externalId;

    try {
        if (window.ttq && typeof window.ttq.identify === 'function') {
            window.ttq.identify(identifyData);
            if (debugMode) {
                logger.log('ttq.identify() called', identifyData);
                logger.updateDebugBadge('Identify User', 'OK');
            }
        }
    } catch (err) {
        turbine.logger.error('[TikTok Pixel] Identify User error: ' + err.message);
    }

    return Promise.resolve();
};