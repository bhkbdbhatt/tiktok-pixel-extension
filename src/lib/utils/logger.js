'use strict';

var PREFIX = '[TikTok Pixel]';

function log(message, payload) {
    if (typeof console !== 'undefined' && console.log) {
        if (payload) {
            console.log(PREFIX + ' ' + message, payload);
        } else {
            console.log(PREFIX + ' ' + message);
        }
    }
}

function updateDebugBadge(eventName, status) {
    if (typeof document === 'undefined') return;

    var badge = document.getElementById('ttq-debug-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'ttq-debug-badge';
        badge.style.cssText = [
            'position: fixed',
            'bottom: 12px',
            'right: 12px',
            'z-index: 999999',
            'background: #010101',
            'color: #00f2fe',
            'border: 1px solid #fe2c55',
            'padding: 8px 12px',
            'font-family: monospace',
            'font-size: 11px',
            'border-radius: 4px',
            'box-shadow: 0 2px 8px rgba(0,0,0,0.3)',
            'pointer-events: none'
        ].join(';');
        document.body.appendChild(badge);
    }

    badge.innerHTML = '<strong>' + PREFIX + '</strong> ' + eventName + ' <span style="color:' + (status === 'OK' ? '#00ff66' : '#ff3366') + '">[' + status + ']</span>';
}

module.exports = {
    log: log,
    updateDebugBadge: updateDebugBadge
};