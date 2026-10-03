const sha256 = require('../src/lib/utils/sha256');

describe('SHA-256 Utility', () => {
    test('correctly normalizes and hashes input string', async () => {
        const email = ' TestUser@Example.com ';
        const hash = await sha256(email);
        // SHA256 of "testuser@example.com"
        expect(hash).toBe('973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b');
    });

    test('returns empty string for null input', async () => {
        const hash = await sha256(null);
        expect(hash).toBe('');
    });
});