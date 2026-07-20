const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return console.log('No user');
    const personalId = 'personal-' + user.id;
    console.log('Testing creation for', personalId);
    const sanctuary = await prisma.group.upsert({
      where: { id: personalId },
      update: {},
      create: {
        id: personalId,
        name: user.name + '\\\'s Sanctuary',
        creatorId: user.id,
        currentSlide: '1',
      },
    });
    console.log(sanctuary);
    await prisma.membership.upsert({
      where: {
        groupId_userId: { groupId: personalId, userId: user.id },
      },
      update: { role: 'LEADER' },
      create: {
        groupId: personalId,
        userId: user.id,
        role: 'LEADER',
      },
    });
    console.log('Success!');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
