const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDuplicateMembershipNumbers() {
    try {
        console.log('🔍 Checking for duplicate membership numbers...');
        
        // Find all users with duplicate membership numbers
        const users = await prisma.user.findMany({
            where: {
                membershipNumber: {
                    not: null
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        const membershipNumberCounts = {};
        const duplicates = [];

        // Count occurrences of each membership number
        users.forEach(user => {
            if (user.membershipNumber) {
                if (!membershipNumberCounts[user.membershipNumber]) {
                    membershipNumberCounts[user.membershipNumber] = [];
                }
                membershipNumberCounts[user.membershipNumber].push(user);
            }
        });

        // Find duplicates
        Object.entries(membershipNumberCounts).forEach(([membershipNumber, userList]) => {
            if (userList.length > 1) {
                duplicates.push({
                    membershipNumber,
                    users: userList
                });
            }
        });

        if (duplicates.length === 0) {
            console.log('✅ No duplicate membership numbers found!');
            return;
        }

        console.log(`⚠️  Found ${duplicates.length} duplicate membership numbers:`);
        
        // Fix duplicates by making them unique
        for (const duplicate of duplicates) {
            console.log(`\n📝 Fixing duplicate: ${duplicate.membershipNumber}`);
            console.log(`   Found ${duplicate.users.length} users with this number`);
            
            // Keep the first user (oldest) with the original number
            const [firstUser, ...otherUsers] = duplicate.users;
            console.log(`   Keeping original for user: ${firstUser.firstName} ${firstUser.lastName} (${firstUser.id})`);
            
            // Update other users with unique numbers
            for (let i = 0; i < otherUsers.length; i++) {
                const user = otherUsers[i];
                const newMembershipNumber = `${duplicate.membershipNumber}-${i + 1}`;
                
                console.log(`   Updating user: ${user.firstName} ${user.lastName} (${user.id})`);
                console.log(`   New membership number: ${newMembershipNumber}`);
                
                await prisma.user.update({
                    where: { id: user.id },
                    data: { membershipNumber: newMembershipNumber }
                });
            }
        }

        console.log('\n✅ All duplicate membership numbers have been fixed!');
        
        // Verify the fix
        console.log('\n🔍 Verifying fix...');
        const verificationUsers = await prisma.user.findMany({
            where: {
                membershipNumber: {
                    not: null
                }
            }
        });

        const verificationCounts = {};
        verificationUsers.forEach(user => {
            if (user.membershipNumber) {
                verificationCounts[user.membershipNumber] = (verificationCounts[user.membershipNumber] || 0) + 1;
            }
        });

        const remainingDuplicates = Object.entries(verificationCounts).filter(([_, count]) => count > 1);
        
        if (remainingDuplicates.length === 0) {
            console.log('✅ Verification successful - no remaining duplicates!');
        } else {
            console.log('❌ Verification failed - duplicates still exist:');
            remainingDuplicates.forEach(([number, count]) => {
                console.log(`   ${number}: ${count} occurrences`);
            });
        }

    } catch (error) {
        console.error('❌ Error fixing duplicate membership numbers:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
fixDuplicateMembershipNumbers()
    .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    }); 