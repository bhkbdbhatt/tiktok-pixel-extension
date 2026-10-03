'use strict';

var sha256 = require('../utils/sha256');
var uuid = require('../utils/uuid');
var logger = require('../utils/logger');

module.exports = function (settings, event) {
    var extSettings = turbine.getExtensionSettings();
    var debugMode = !!extSettings.debugMode;

    if (window.__ttq_failed) {
        if (debugMode) logger.log('Tracking skipped because ttq failed to load.');
        return Promise.resolve();
    }

    var eventName = settings.eventName === 'Custom' ? settings.customEventName : settings.eventName;
    if (!eventName) {
        turbine.logger.warn('[TikTok Pixel] No event name specified for trackEvent action.');
        return Promise.resolve();
    }

    // 1. Resolve Data Elements / Bound Properties
    var resolvedEventId = turbine.getDataElementValue('eventId', event) || uuid();
    var value = turbine.getDataElementValue('value', event);
    var currency = turbine.getDataElementValue('currency', event);
    var contentId = turbine.getDataElementValue('contentId', event);
    var contentName = turbine.getDataElementValue('contentName', event);
    var contentType = turbine.getDataElementValue('contentType', event) || extSettings.content_type;
    var contentIds = turbine.getDataElementValue('contentIds', event);
    var query = turbine.getDataElementValue('query', event);

    // User Identifiers
    var rawEmail = turbine.getDataElementValue('email', event);
    var rawPhone = turbine.getDataElementValue('phoneNumber', event);
    var rawExternalId = turbine.getDataElementValue('externalId', event);

    // 2. Build Pixel Standard Parameters
    var properties = {};
    if (value !== undefined && value !== '') properties.value = Number(value);
    if (currency) properties.currency = currency;
    if (contentType) properties.content_type = contentType;
    if (contentId) properties.content_id = String(contentId);
    if (contentName) properties.content_name = contentName;
    if (query) properties.query = query;

    if (contentIds) {
        if (typeof contentIds === 'string') {
            properties.content_ids = contentIds.split(',').map(function (s) { return s.trim(); });
        } else if (Array.isArray(contentIds)) {
            properties.content_ids = contentIds;
        }
    }

    // Merge Custom Object parameters if supplied
    var customParamsRaw = turbine.getDataElementValue('customParams', event);
    if (customParamsRaw) {
        try {
            var parsed = typeof customParamsRaw === 'string' ? JSON.parse(customParamsRaw) : customParamsRaw;
            Object.assign(properties, parsed);
        } catch (e) {
            turbine.logger.warn('[TikTok Pixel] Failed to parse customParams JSON: ' + e.message);
        }
    }

    // 3. Client-Side Track Call
    try {
        if (window.ttq && typeof window.ttq.track === 'function') {
            window.ttq.track(eventName, properties, { event_id: resolvedEventId });
            if (debugMode) {
                logger.log('Client-side Event Tracked: ' + eventName, { properties: properties, event_id: resolvedEventId });
                logger.updateDebugBadge(eventName + ' (Client)', 'OK');
            }
        }
    } catch (err) {
        turbine.logger.error('[TikTok Pixel] Client-side track call threw error: ' + err.message);
    }

    // 4. Server-Side Events API Dispatch (Parallel / Non-Blocking)
    if (!extSettings.eventsApiEnabled) {
        return Promise.resolve();
    }

    return Promise.all([
        sha256(rawEmail),
        sha256(rawPhone),
        sha256(rawExternalId)
    ]).then(function (hashedUser) {
        var payload = {
            pixel_code: extSettings.pixelId,
            event: eventName,
            event_id: resolvedEventId,
            timestamp: Math.floor(Date.now() / 1000),
            context: {
                page: {
                    url: window.location.href
                },
                user: {
                    email: hashedUser[0] || undefined,
                    phone_number: hashedUser[1] || undefined,
                    external_id: hashedUser[2] || undefined
                },
                client_user_agent: navigator.userAgent,
                ip: '${client_ip}'
            },
            properties: properties
        };

        var endpoint = extSettings.eventsApiEndpoint || 'https://business-api.tiktok.com/open_api/v1.3/pixel/track/';
        var token = extSettings.eventsApiAccessToken;

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 10000) : null;

        return fetch(endpoint, {
            method: 'POST',
            headers: {
                'Access-Token': token || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller ? controller.signal : undefined
        }).then(function (response) {
            if (timeoutId) clearTimeout(timeoutId);
            if (debugMode) {
                logger.log('Events API Server Dispatch completed with status: ' + response.status, payload);
                logger.updateDebugBadge(eventName + ' (Server)', response.ok ? 'OK' : 'ERR');
            }
        }).catch(function (err) {
            if (timeoutId) clearTimeout(timeoutId);
            turbine.logger.warn('[TikTok Pixel] Events API call failed or timed out: ' + err.message);
            if (debugMode) logger.updateDebugBadge(eventName + ' (Server)', 'ERR');
        });
    }).catch(function (err) {
        turbine.logger.error('[TikTok Pixel] Error preparing server-side payload: ' + err.message);
    });
};