const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'shah@yopmail.com';
  const plainPassword = 'defaultPassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log('Password updated and hashed for', email);
  await prisma.$disconnect();
}

main(); 