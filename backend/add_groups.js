const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addGroupsToNewUser() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  if (!user) return console.log("No users found");

  console.log(`Found newest user: ${user.email} (${user.id})`);

  // Create demo groups if they don't exist
  const group1 = await prisma.group.upsert({
    where: { id: 'group-1' },
    update: {},
    create: {
      id: 'group-1',
      name: 'CS-229 Neural Network Room',
      creatorId: user.id,
      currentSlide: '1',
    }
  });

  const group2 = await prisma.group.upsert({
    where: { id: 'group-2' },
    update: {},
    create: {
      id: 'group-2',
      name: 'CS-109 Study Desk',
      creatorId: user.id,
      currentSlide: '1',
    }
  });

  // Add user to these groups
  await prisma.membership.upsert({
    where: { groupId_userId: { groupId: group1.id, userId: user.id } },
    update: { role: 'LEADER' },
    create: { groupId: group1.id, userId: user.id, role: 'LEADER' }
  });

  await prisma.membership.upsert({
    where: { groupId_userId: { groupId: group2.id, userId: user.id } },
    update: { role: 'LEADER' },
    create: { groupId: group2.id, userId: user.id, role: 'LEADER' }
  });

  console.log("Added groups to user!");
}

addGroupsToNewUser().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
