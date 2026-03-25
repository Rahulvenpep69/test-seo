import { prisma } from './prisma';

/**
 * Get a specific system setting from the database.
 * @param key The setting key (e.g., 'openai_api_key')
 * @returns The setting value or null if not found.
 */
export async function getSystemSetting(key: string): Promise<string | null> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key },
        });
        console.log(`[Settings] DB query for ${key} result:`, !!setting);
        return setting?.value || null;
    } catch (error) {
        console.error(`[Settings] Failed to fetch setting ${key}:`, error);
        return null;
    }
}

/**
 * Get the OpenAI API Key, checking process.env first then the database.
 */
export async function getOpenAiApiKey(): Promise<string | null> {
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey && envKey.trim().length > 10) {
        return envKey;
    }

    const dbKey = await getSystemSetting('openai_api_key');
    if (dbKey) return dbKey;

    // Last resort fail-safe for local development issues
    return null;
}

/**
 * Get the Gemini API Key, checking process.env first then the database.
 */
export async function getGeminiApiKey(): Promise<string | null> {
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }

    return getSystemSetting('gemini_api_key');
}
