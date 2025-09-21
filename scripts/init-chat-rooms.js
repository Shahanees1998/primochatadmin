const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeChatRooms() {
    try {
        console.log('Initializing chat rooms...');

        // Get or create admin user
        let adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!adminUser) {
            console.log('Creating admin user...');
            adminUser = await prisma.user.create({
                data: {
                    firstName: 'Admin',
                    lastName: 'User',
                    email: 'admin@primochat.com',
                    password: 'adminPassword123',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    membershipNumber: 'ADMIN001'
                }
            });
            console.log('Admin user created:', adminUser.id);
        }

        // Check if General chat room exists
        let generalRoom = await prisma.chatRoom.findFirst({
            where: { name: 'Group Chat' }
        });

        if (!generalRoom) {
            console.log('Creating General chat room...');
            generalRoom = await prisma.chatRoom.create({
                data: {
                    name: 'Group Chat',
                    isGroup: true,
                    participants: {
                        create: {
                            userId: adminUser.id
                        }
                    }
                }
            });
            console.log('General chat room created:', generalRoom.id);
        } else {
            console.log('General chat room already exists:', generalRoom.id);
        }

        // Check if admin is a participant in the general room
        const participant = await prisma.chatParticipant.findFirst({
            where: {
                chatRoomId: generalRoom.id,
                userId: adminUser.id
            }
        });

        if (!participant) {
            console.log('Adding admin to General chat room...');
            await prisma.chatParticipant.create({
                data: {
                    chatRoomId: generalRoom.id,
                    userId: adminUser.id
                }
            });
            console.log('Admin added to General chat room');
        }

        console.log('Chat rooms initialization completed successfully!');
    } catch (error) {
        console.error('Error initializing chat rooms:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the initialization
initializeChatRooms(); 