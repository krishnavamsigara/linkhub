import { themeRepository } from '../src/modules/themes/theme.repository.js';
import { disconnectDatabase } from '../src/infrastructure/database/prisma.js';

const themes = [
  // ─── FREE Themes ─────────────────────────────────────────────────────────
  {
    name: 'Classic Light',
    description: 'Clean, minimal light theme — perfect for all profiles',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    buttonStyle: 'rounded',
    buttonColor: '#4f46e5',
    textColor: '#1a1a2e',
    fontFamily: 'Inter',
    isPro: false,
  },
  {
    name: 'Midnight Dark',
    description: 'Sleek dark theme for a bold and professional look',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    buttonStyle: 'rounded',
    buttonColor: '#7c3aed',
    textColor: '#f8fafc',
    fontFamily: 'Inter',
    isPro: false,
  },
  {
    name: 'Ocean Breeze',
    description: 'Calm, refreshing ocean-inspired gradient',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    buttonStyle: 'pill',
    buttonColor: '#ffffff',
    textColor: '#ffffff',
    fontFamily: 'Outfit',
    isPro: false,
  },
  {
    name: 'Sunset Warm',
    description: 'Warm sunset gradient that feels inviting and energetic',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    buttonStyle: 'rounded',
    buttonColor: '#fff',
    textColor: '#fff',
    fontFamily: 'Inter',
    isPro: false,
  },
  {
    name: 'Forest Green',
    description: 'Nature-inspired deep green theme',
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    buttonStyle: 'sharp',
    buttonColor: '#fff',
    textColor: '#fff',
    fontFamily: 'Roboto',
    isPro: false,
  },

  // ─── PRO Themes ──────────────────────────────────────────────────────────
  {
    name: 'Glassmorphism',
    description: 'Ultra-modern frosted glass aesthetic with backdrop blur',
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%), linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    buttonStyle: 'glass',
    buttonColor: 'rgba(255,255,255,0.25)',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    isPro: true,
  },
  {
    name: 'Neon Sunset',
    description: 'Vibrant neon glow with electric purple-to-orange sunset',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    buttonStyle: 'neon',
    buttonColor: '#e94560',
    textColor: '#00f5d4',
    fontFamily: 'Outfit',
    isPro: true,
  },
  {
    name: 'Aurora Borealis',
    description: 'Stunning northern lights with iridescent color shifts',
    background:
      'linear-gradient(135deg, #0d0d0d 0%, #1a0533 30%, #0a3d2e 60%, #1a0533 100%)',
    buttonStyle: 'glow',
    buttonColor: '#a855f7',
    textColor: '#e0ffe8',
    fontFamily: 'Inter',
    isPro: true,
  },
  {
    name: 'Rose Gold Luxury',
    description: 'Elegant rose gold with premium metallic finish',
    background: 'linear-gradient(135deg, #f8cdda 0%, #1d2b64 100%)',
    buttonStyle: 'pill',
    buttonColor: '#b76e79',
    textColor: '#1d2b64',
    fontFamily: 'Roboto',
    isPro: true,
  },
  {
    name: 'Cyberpunk 2077',
    description: 'High-contrast cyberpunk with electric yellow and dark',
    background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #120030 100%)',
    buttonStyle: 'sharp',
    buttonColor: '#fcee0a',
    textColor: '#fcee0a',
    fontFamily: 'Outfit',
    isPro: true,
  },
];

export async function seedThemes(): Promise<void> {
  console.log('🎨 Seeding themes...');

  for (const theme of themes) {
    await themeRepository.upsert(theme);
  }

  const freeCount = themes.filter((t) => !t.isPro).length;
  const proCount = themes.filter((t) => t.isPro).length;

  console.log(
    `✅ Seeded ${themes.length} themes (${freeCount} FREE, ${proCount} PRO)`,
  );
}

// Run standalone if called directly
const isMain = process.argv[1]?.endsWith('themeseed.ts') || 
               process.argv[1]?.endsWith('themeseed.js');

if (isMain) {
  seedThemes()
    .catch((err) => {
      console.error('Theme seed failed:', err);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}
