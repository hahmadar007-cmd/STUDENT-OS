const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.membership.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.course.deleteMany({});
  console.log('Deleted all groups and courses');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
