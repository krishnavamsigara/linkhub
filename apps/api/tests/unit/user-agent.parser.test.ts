import { describe, it, expect } from 'vitest';
import { parseUserAgent } from '../../src/utils/user-agent.parser.js';

describe('UserAgentParser', () => {
  it('should parse Windows Chrome Desktop user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const result = parseUserAgent(ua);

    expect(result.deviceType).toBe('desktop');
    expect(result.browser).toBe('Chrome');
    expect(result.os).toBe('Windows');
  });

  it('should parse iPhone Safari Mobile user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const result = parseUserAgent(ua);

    expect(result.deviceType).toBe('mobile');
    expect(result.browser).toBe('Safari');
    expect(result.os).toBe('iOS');
  });

  it('should parse Android Firefox Mobile user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0';
    const result = parseUserAgent(ua);

    expect(result.deviceType).toBe('mobile');
    expect(result.browser).toBe('Firefox');
    expect(result.os).toBe('Android');
  });

  it('should parse Googlebot correctly as bot', () => {
    const ua =
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    const result = parseUserAgent(ua);

    expect(result.deviceType).toBe('bot');
    expect(result.browser).toBe('Bot');
    expect(result.os).toBe('Bot');
  });

  it('should handle null or empty user agent', () => {
    const result = parseUserAgent(null);
    expect(result.deviceType).toBe('unknown');
    expect(result.browser).toBe('Unknown');
    expect(result.os).toBe('Unknown');
  });
});
