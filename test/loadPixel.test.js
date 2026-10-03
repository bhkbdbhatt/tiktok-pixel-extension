const loadPixel = require('../src/lib/actions/loadPixel');

describe('loadPixel Action', () => {
    beforeEach(() => {
        document.getElementsByTagName('html')[0].innerHTML = '';
        delete window.ttq;
        delete window.__ttq_loaded;
        delete window.__ttq_failed;

        global.turbine = {
            getExtensionSettings: () => ({
                pixelId: 'TEST_PIXEL_123',
                autoPageView: true,
                debugMode: false
            }),
            logger: { warn: jest.fn(), error: jest.fn() }
        };
    });

    test('injects script tag and initializes SDK instance', async () => {
        const promise = loadPixel({});
        expect(window.ttq).toBeDefined();
        expect(typeof window.ttq.load).toBe('function');

        // Simulate script load completion
        const script = document.querySelector('script[src*="analytics.tiktok.com"]');
        expect(script).not.toBeNull();
        script.onload();

        await promise;
        expect(window.__ttq_loaded).toBe(true);
    });
});