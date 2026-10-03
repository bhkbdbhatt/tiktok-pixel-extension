'use strict';

var isListening = false;

module.exports = function initSPAListener(callback) {
    if (isListening || typeof window === 'undefined' || !window.history) return;
    isListening = true;

    var firePageView = function () {
        setTimeout(function () {
            callback(window.location.href);
        }, 50);
    };

    var originalPushState = window.history.pushState;
    if (originalPushState) {
        window.history.pushState = function () {
            var result = originalPushState.apply(this, arguments);
            firePageView();
            return result;
        };
    }

    var originalReplaceState = window.history.replaceState;
    if (originalReplaceState) {
        window.history.replaceState = function () {
            var result = originalReplaceState.apply(this, arguments);
            firePageView();
            return result;
        };
    }

    window.addEventListener('popstate', firePageView);
};