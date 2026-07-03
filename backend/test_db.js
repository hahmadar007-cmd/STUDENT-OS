const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.group.findMany({
    include: {
      creator: true
    }
  });
  console.log(JSON.stringify(groups.map(g => ({
    name: g.name,
    creatorEmail: g.creator.email,
    id: g.id
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
