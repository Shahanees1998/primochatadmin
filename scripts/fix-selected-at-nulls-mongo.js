const { MongoClient } = require('mongodb');

async function fixSelectedAtNulls() {
  const client = new MongoClient(process.env.DATABASE_URL);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    const collection = db.collection('user_meal_selections');
    
    console.log('Starting to fix null selectedAt values...');
    
    // Find all documents with null selectedAt
    const nullRecords = await collection.find({
      selectedAt: null
    }).toArray();
    
    console.log(`Found ${nullRecords.length} records with null selectedAt values`);
    
    if (nullRecords.length === 0) {
      console.log('No records to fix. All selectedAt values are already set.');
      return;
    }
    
    // Update each record to use createdAt as selectedAt
    let updatedCount = 0;
    for (const record of nullRecords) {
      try {
        const result = await collection.updateOne(
          { _id: record._id },
          { 
            $set: { 
              selectedAt: record.createdAt // Use createdAt as selectedAt
            }
          }
        );
        
        if (result.modifiedCount === 1) {
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to update record ${record._id}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} records`);
    
    // Verify the fix
    const remainingNulls = await collection.countDocuments({
      selectedAt: null
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
    await client.close();
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
