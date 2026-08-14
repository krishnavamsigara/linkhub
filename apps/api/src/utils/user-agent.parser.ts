export interface ParsedUserAgent {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  browser: string;
  os: string;
}

export const parseUserAgent = (uaString?: string | null): ParsedUserAgent => {
  if (!uaString) {
    return { deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = uaString.toLowerCase();

  // 1. Detect Bots
  if (
    /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sitemap/i.test(
      ua,
    )
  ) {
    return { deviceType: 'bot', browser: 'Bot', os: 'Bot' };
  }

  // 2. Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown' = 'desktop';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (
    /mobile|iphone|ipod|android|blackberry|opera mini|windows phone|iemobile/i.test(
      ua,
    )
  ) {
    deviceType = 'mobile';
  }

  // 3. Detect OS (check mobile OS before desktop OS)
  let os = 'Other';
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  // 4. Detect Browser
  let browser = 'Other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'IE';

  return { deviceType, browser, os };
};
