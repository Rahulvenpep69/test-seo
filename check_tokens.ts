import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tokens = await prisma.gscToken.findMany({
        include: {
            user: {
                select: {
                    email: true,
                    name: true
                }
            }
        }
    });

    console.log(`Total GSC tokens: ${tokens.length}`);
    tokens.forEach(t => {
        console.log(`Token for user: ${t.user.email} (${t.user.name}), Updated: ${t.updatedAt}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
