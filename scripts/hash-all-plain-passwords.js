const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    // If the password is not hashed (bcrypt hashes are 60 chars and start with $2)
    if (user.password && (user.password.length < 60 || !user.password.startsWith('$2'))) {
      const hashed = await bcrypt.hash(user.password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed }
      });
      console.log('Hashed password for', user.email);
    }
  }
  await prisma.$disconnect();
}
main(); 