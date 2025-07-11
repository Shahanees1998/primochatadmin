const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDocuments() {
    try {
        console.log('Starting document fix...');

        // Get or create default admin user
        let adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });

        if (!adminUser) {
            console.log('Creating default admin user...');
            adminUser = await prisma.user.create({
                data: {
                    email: 'admin@primochat.com',
                    password: 'defaultPassword123',
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                },
            });
            console.log('Default admin user created with ID:', adminUser.id);
        } else {
            console.log('Found existing admin user with ID:', adminUser.id);
        }

        // Find documents with invalid uploadedBy values (specifically 'admin' string)
        const documents = await prisma.document.findMany({
            where: {
                uploadedBy: 'admin'
            }
        });

        console.log(`Found ${documents.length} documents with invalid uploadedBy values`);

        // Update documents with valid admin user ID
        for (const doc of documents) {
            await prisma.document.update({
                where: { id: doc.id },
                data: { uploadedBy: adminUser.id }
            });
            console.log(`Updated document: ${doc.title}`);
        }

        console.log('Document fix completed successfully!');
    } catch (error) {
        console.error('Error fixing documents:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDocuments(); 