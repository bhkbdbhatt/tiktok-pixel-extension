'use strict';
module.exports = function (settings) {
    return settings.value !== undefined ? settings.value : '';
};