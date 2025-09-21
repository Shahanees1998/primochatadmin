const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSelectedAtNulls() {
  try {
    console.log('Starting to fix null selectedAt values...');
    
    // Find all UserMealSelection records with null selectedAt
    const nullRecords = await prisma.userMealSelection.findMany({
      where: {
        selectedAt: null
      }
    });
    
    console.log(`Found ${nullRecords.length} records with null selectedAt values`);
    
    if (nullRecords.length === 0) {
      console.log('No records to fix. All selectedAt values are already set.');
      return;
    }
    
    // Update each record to use createdAt as selectedAt (since selectedAt should be when the meal was selected)
    let updatedCount = 0;
    for (const record of nullRecords) {
      try {
        await prisma.userMealSelection.update({
          where: {
            id: record.id
          },
          data: {
            selectedAt: record.createdAt // Use createdAt as selectedAt since that's when the record was created
          }
        });
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update record ${record.id}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} records`);
    
    // Verify the fix
    const remainingNulls = await prisma.userMealSelection.count({
      where: {
        selectedAt: null
      }
    });
    
    console.log(`Remaining null selectedAt records: ${remainingNulls}`);
    
    if (remainingNulls === 0) {
      console.log('✅ All selectedAt null values have been fixed!');
    } else {
      console.log('⚠️ Some null values still remain. Manual intervention may be required.');
    }
    
  } catch (error) {
    console.error('Error fixing selectedAt null values:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixSelectedAtNulls()
  .then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
