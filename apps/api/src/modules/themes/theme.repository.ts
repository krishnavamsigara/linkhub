import { prisma } from '../../infrastructure/database/prisma.js';

export interface ThemeRow {
  id: string;
  name: string;
  description: string | null;
  background: string;
  button_style: string;
  button_color: string;
  text_color: string;
  font_family: string;
  is_pro: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MappedTheme {
  id: string;
  name: string;
  description: string | null;
  background: string;
  buttonStyle: string;
  buttonColor: string;
  textColor: string;
  fontFamily: string;
  isPro: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function mapTheme(row: ThemeRow): MappedTheme {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    background: row.background,
    buttonStyle: row.button_style,
    buttonColor: row.button_color,
    textColor: row.text_color,
    fontFamily: row.font_family,
    isPro: row.is_pro,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ThemeRepository {
  async findAll(): Promise<MappedTheme[]> {
    const rows = await prisma.$queryRaw<ThemeRow[]>`
      SELECT * FROM themes ORDER BY is_pro ASC, name ASC
    `;
    return rows.map(mapTheme);
  }

  async findById(id: string): Promise<MappedTheme | null> {
    const rows = await prisma.$queryRaw<ThemeRow[]>`
      SELECT * FROM themes WHERE id = ${id}::uuid LIMIT 1
    `;
    return rows.length > 0 ? mapTheme(rows[0]!) : null;
  }

  async findFreeThemes(): Promise<MappedTheme[]> {
    const rows = await prisma.$queryRaw<ThemeRow[]>`
      SELECT * FROM themes WHERE is_pro = false ORDER BY name ASC
    `;
    return rows.map(mapTheme);
  }

  async upsert(data: {
    name: string;
    description?: string | null;
    background: string;
    buttonStyle: string;
    buttonColor: string;
    textColor: string;
    fontFamily: string;
    isPro: boolean;
  }): Promise<MappedTheme> {
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO themes (name, description, background, button_style, button_color, text_color, font_family, is_pro, updated_at)
      VALUES (
        ${data.name},
        ${data.description ?? null},
        ${data.background},
        ${data.buttonStyle},
        ${data.buttonColor},
        ${data.textColor},
        ${data.fontFamily},
        ${data.isPro},
        ${now}
      )
      ON CONFLICT (name) DO UPDATE SET
        description = ${data.description ?? null},
        background = ${data.background},
        button_style = ${data.buttonStyle},
        button_color = ${data.buttonColor},
        text_color = ${data.textColor},
        font_family = ${data.fontFamily},
        is_pro = ${data.isPro},
        updated_at = ${now}
    `;
    const rows = await prisma.$queryRaw<ThemeRow[]>`
      SELECT * FROM themes WHERE name = ${data.name} LIMIT 1
    `;
    return mapTheme(rows[0]!);
  }
}

export const themeRepository = new ThemeRepository();
