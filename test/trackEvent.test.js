'use strict';

const trackEvent = require('../src/lib/actions/trackEvent');

describe('trackEvent Action', () => {
    let mockFetch;

    beforeEach(() => {
        // Clear DOM and global states
        delete window.ttq;
        delete window.__ttq_failed;
        delete window.__ttq_loaded;

        // Mock ttq instance on window
        window.ttq = {
            track: jest.fn()
        };

        // Mock fetch for Events API calls
        mockFetch = jest.fn().mockResolvedValue({
            status: 200,
            ok: true,
            json: () => Promise.resolve({ code: 0, message: 'OK' })
        });
        global.fetch = mockFetch;

        // Mock global Adobe turbine object
        global.turbine = {
            getExtensionSettings: jest.fn().mockReturnValue({
                pixelId: 'TEST_PIXEL_123',
                content_type: 'product',
                eventsApiEnabled: true,
                eventsApiAccessToken: 'TEST_TOKEN_XYZ',
                eventsApiEndpoint: 'https://business-api.tiktok.com/open_api/v1.3/pixel/track/',
                debugMode: false
            }),
            getDataElementValue: jest.fn((key) => {
                const mockDataElements = {
                    eventId: 'evt-unique-1234',
                    value: '99.99',
                    currency: 'USD',
                    contentId: 'prod-001',
                    contentName: 'TikTok T-Shirt',
                    contentType: 'product',
                    contentIds: 'prod-001, prod-002',
                    query: 'shirt',
                    email: '  User@Example.com ',
                    phoneNumber: '+11234567890',
                    externalId: 'ext-user-99',
                    customParams: '{"category":"apparel"}'
                };
                return mockDataElements[key];
            }),
            logger: {
                warn: jest.fn(),
                error: jest.fn()
            }
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('calls ttq.track with resolved properties and explicit event_id', async () => {
        const actionSettings = { eventName: 'AddToCart' };

        await trackEvent(actionSettings, {});

        expect(window.ttq.track).toHaveBeenCalledTimes(1);
        expect(window.ttq.track).toHaveBeenCalledWith(
            'AddToCart',
            {
                value: 99.99,
                currency: 'USD',
                content_type: 'product',
                content_id: 'prod-001',
                content_name: 'TikTok T-Shirt',
                content_ids: ['prod-001', 'prod-002'],
                query: 'shirt',
                category: 'apparel'
            },
            { event_id: 'evt-unique-1234' }
        );
    });

    test('dispatches POST request to Events API with hashed user properties when eventsApiEnabled is true', async () => {
        const actionSettings = { eventName: 'AddToCart' };

        await trackEvent(actionSettings, {});

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [endpoint, options] = mockFetch.mock.calls[0];

        expect(endpoint).toBe('https://business-api.tiktok.com/open_api/v1.3/pixel/track/');
        expect(options.method).toBe('POST');
        expect(options.headers).toEqual({
            'Access-Token': 'TEST_TOKEN_XYZ',
            'Content-Type': 'application/json'
        });

        const body = JSON.parse(options.body);
        expect(body.pixel_code).toBe('TEST_PIXEL_123');
        expect(body.event).toBe('AddToCart');
        expect(body.event_id).toBe('evt-unique-1234');
        expect(body.properties.value).toBe(99.99);

        // Verify SHA-256 Hashing ("user@example.com" normalized)
        expect(body.context.user.email).toBe('b58992226742d48c21da7e7c3e49b96b82321630c9a69b421d6baf50b238129a');
        expect(body.context.user.phone_number).toBeDefined();
        expect(body.context.user.external_id).toBeDefined();
    });

    test('handles Custom event name mapping correctly', async () => {
        const actionSettings = {
            eventName: 'Custom',
            customEventName: 'ClickPromotedBanner'
        };

        await trackEvent(actionSettings, {});

        expect(window.ttq.track).toHaveBeenCalledWith(
            'ClickPromotedBanner',
            expect.any(Object),
            expect.any(Object)
        );
    });

    test('skips tracking cleanly when script failed to load (__ttq_failed = true)', async () => {
        window.__ttq_failed = true;

        await trackEvent({ eventName: 'Purchase' }, {});

        expect(window.ttq.track).not.toHaveBeenCalled();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test('does not trigger Events API call if eventsApiEnabled is false', async () => {
        global.turbine.getExtensionSettings.mockReturnValue({
            pixelId: 'TEST_PIXEL_123',
            eventsApiEnabled: false
        });

        await trackEvent({ eventName: 'ViewContent' }, {});

        expect(window.ttq.track).toHaveBeenCalledTimes(1);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test('catches Events API fetch failures gracefully without rejecting rule chain', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(trackEvent({ eventName: 'Purchase' }, {})).resolves.not.toThrow();

        expect(global.turbine.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Events API call failed or timed out')
        );
    });
});