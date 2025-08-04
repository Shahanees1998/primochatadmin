const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTrestleBoardCreatedBy() {
  try {
    console.log('🔍 Finding trestleBoard records with null createdById...');
    
    // Find all trestleBoard records with null createdById
    const trestleBoardsWithNullCreatedBy = await prisma.trestleBoard.findMany({
      where: {
        createdById: null
      }
    });

    console.log(`Found ${trestleBoardsWithNullCreatedBy.length} trestleBoard records with null createdById`);

    if (trestleBoardsWithNullCreatedBy.length === 0) {
      console.log('✅ No records to fix!');
      return;
    }

    // Find the first admin user to use as default creator
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Creating a default admin user...');
      
      // Create a default admin user
      const defaultAdmin = await prisma.user.create({
        data: {
          email: 'admin@primochat.com',
          password: '$2b$10$defaultpassword', // This should be changed later
          firstName: 'System',
          lastName: 'Admin',
          role: 'ADMIN',
          status: 'ACTIVE',
          membershipNumber: 'ADMIN001'
        }
      });
      
      console.log(`✅ Created default admin user: ${defaultAdmin.id}`);
      
      // Update all trestleBoard records with null createdById
      const updateResult = await prisma.trestleBoard.updateMany({
        where: {
          createdById: null
        },
        data: {
          createdById: defaultAdmin.id
        }
      });
      
      console.log(`✅ Updated ${updateResult.count} trestleBoard records with default admin user`);
    } else {
      console.log(`✅ Using existing admin user: ${adminUser.id} (${adminUser.firstName} ${adminUser.lastName})`);
      
      // Update all trestleBoard records with null createdById
      const updateResult = await prisma.trestleBoard.updateMany({
        where: {
          createdById: null
        },
        data: {
          createdById: adminUser.id
        }
      });
      
      console.log(`✅ Updated ${updateResult.count} trestleBoard records with admin user`);
    }

    // Verify the fix
    const remainingNullRecords = await prisma.trestleBoard.findMany({
      where: {
        createdById: null
      }
    });

    if (remainingNullRecords.length === 0) {
      console.log('✅ All trestleBoard records now have valid createdById values!');
    } else {
      console.log(`❌ Still have ${remainingNullRecords.length} records with null createdById`);
    }

  } catch (error) {
    console.error('❌ Error fixing trestleBoard createdById:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixTrestleBoardCreatedBy(); 