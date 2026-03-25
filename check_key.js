import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkKey() {
    const setting = await prisma.systemSetting.findUnique({
        where: { key: 'gemini_api_key' }
    });
    console.log("Gemini Key in DB:", setting ? `Exists (Length: ${setting.value.length})` : "Not Found");
    await prisma.$disconnect();
}

checkKey().catch(console.error);
