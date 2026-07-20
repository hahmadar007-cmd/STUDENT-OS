const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSanctuary() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found.");
    return;
  }
  const userId = user.id;
  const personalId = `personal-${userId}`;
  console.log(`User: ${userId}`);

  try {
    const sanctuary = await prisma.group.upsert({
      where: { id: personalId },
      update: {},
      create: {
        id: personalId,
        name: `${user.name ?? 'My'}'s Sanctuary`,
        creatorId: userId,
        currentSlide: '1',
      },
    });
    console.log("Sanctuary:", sanctuary);
  } catch (e) {
    console.error("Sanctuary Error:", e);
  }

  try {
    const membership = await prisma.membership.upsert({
      where: {
        groupId_userId: { groupId: personalId, userId },
      },
      update: { role: 'LEADER' },
      create: {
        groupId: personalId,
        userId,
        role: 'LEADER',
      },
    });
    console.log("Membership:", membership);
  } catch (e) {
    console.error("Membership Error:", e);
  }
}

testSanctuary()
  .then(() => process.exit(0))
  .catch(console.error);
