const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding dashboard data...');

    // Create admin user if it doesn't exist
    let adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!adminUser) {
        const hashedPassword = await bcrypt.hash('defaultPassword123', 10);
        adminUser = await prisma.user.create({
            data: {
                email: 'admin@primochat.com',
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
                role: 'ADMIN',
                status: 'ACTIVE',
                membershipNumber: 'ADMIN001'
            }
        });
        console.log('Created admin user:', adminUser.email);
    }

    // Create some sample users
    const sampleUsers = [
        {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'MEMBER',
            status: 'ACTIVE',
            membershipNumber: 'MEM001'
        },
        {
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'MEMBER',
            status: 'PENDING',
            membershipNumber: 'MEM002'
        },
        {
            email: 'bob.wilson@example.com',
            firstName: 'Bob',
            lastName: 'Wilson',
            role: 'MEMBER',
            status: 'ACTIVE',
            membershipNumber: 'MEM003'
        },
        {
            email: 'alice.johnson@example.com',
            firstName: 'Alice',
            lastName: 'Johnson',
            role: 'MEMBER',
            status: 'PENDING',
            membershipNumber: 'MEM004'
        }
    ];

    for (const userData of sampleUsers) {
        const existingUser = await prisma.user.findUnique({
            where: { email: userData.email }
        });

        if (!existingUser) {
            const hashedPassword = await bcrypt.hash('defaultPassword123', 10);
            await prisma.user.create({
                data: {
                    ...userData,
                    password: hashedPassword
                }
            });
            console.log('Created user:', userData.email);
        }
    }

    // Create sample events
    const sampleEvents = [
        {
            title: 'Monthly Meeting',
            description: 'Regular monthly organization meeting',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
            location: 'Main Hall',
            category: 'REGULAR_MEETING',
            type: 'REGULAR',
            isRSVP: true,
            maxAttendees: 50
        },
        {
            title: 'Annual Conference',
            description: 'Annual organization conference',
            startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 hours later
            location: 'Conference Center',
            category: 'DISTRICT',
            type: 'DISTRICT',
            isRSVP: true,
            maxAttendees: 200
        },
        {
            title: 'Social Gathering',
            description: 'Informal social gathering for members',
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
            location: 'Community Center',
            category: 'SOCIAL',
            type: 'SOCIAL',
            isRSVP: false
        }
    ];

    for (const eventData of sampleEvents) {
        const existingEvent = await prisma.event.findFirst({
            where: { title: eventData.title }
        });

        if (!existingEvent) {
            await prisma.event.create({
                data: eventData
            });
            console.log('Created event:', eventData.title);
        }
    }

    // Create sample support requests
    const users = await prisma.user.findMany({
        where: { role: 'MEMBER' },
        take: 3
    });

    const sampleSupportRequests = [
        {
            subject: 'Login Issue',
            message: 'I am having trouble logging into my account. Can you help?',
            priority: 'MEDIUM',
            status: 'OPEN'
        },
        {
            subject: 'Password Reset',
            message: 'I need to reset my password as I forgot it.',
            priority: 'HIGH',
            status: 'OPEN'
        },
        {
            subject: 'Event Registration',
            message: 'I would like to register for the upcoming event.',
            priority: 'LOW',
            status: 'OPEN'
        }
    ];

    for (let i = 0; i < sampleSupportRequests.length && i < users.length; i++) {
        const requestData = sampleSupportRequests[i];
        const user = users[i];

        const existingRequest = await prisma.supportRequest.findFirst({
            where: {
                userId: user.id,
                subject: requestData.subject
            }
        });

        if (!existingRequest) {
            await prisma.supportRequest.create({
                data: {
                    ...requestData,
                    userId: user.id
                }
            });
            console.log('Created support request:', requestData.subject);
        }
    }

    // Create sample documents
    const sampleDocuments = [
        {
            title: 'Meeting Minutes - January 2024',
            description: 'Minutes from the January monthly meeting',
            fileName: 'meeting-minutes-jan-2024.pdf',
            fileUrl: '/documents/meeting-minutes-jan-2024.pdf',
            fileType: 'application/pdf',
            fileSize: 1024000,
            category: 'Minutes',
            tags: ['meeting', 'minutes', 'january'],
            permissions: 'MEMBER_ONLY'
        },
        {
            title: 'Organization Bylaws',
            description: 'Current organization bylaws and constitution',
            fileName: 'organization-bylaws.pdf',
            fileUrl: '/documents/organization-bylaws.pdf',
            fileType: 'application/pdf',
            fileSize: 2048000,
            category: 'Legal',
            tags: ['bylaws', 'constitution', 'legal'],
            permissions: 'PUBLIC'
        },
        {
            title: 'Event Guidelines',
            description: 'Guidelines for organizing and participating in events',
            fileName: 'event-guidelines.pdf',
            fileUrl: '/documents/event-guidelines.pdf',
            fileType: 'application/pdf',
            fileSize: 512000,
            category: 'Guidelines',
            tags: ['events', 'guidelines', 'participation'],
            permissions: 'MEMBER_ONLY'
        }
    ];

    for (const docData of sampleDocuments) {
        const existingDoc = await prisma.document.findFirst({
            where: { title: docData.title }
        });

        if (!existingDoc) {
            await prisma.document.create({
                data: {
                    ...docData,
                    uploadedBy: adminUser.id
                }
            });
            console.log('Created document:', docData.title);
        }
    }

    // Create sample festive boards
    const events = await prisma.event.findMany({
        take: 2
    });

    for (const event of events) {
        const existingBoard = await prisma.festiveBoard.findFirst({
            where: { eventId: event.id }
        });

        if (!existingBoard) {
            await prisma.festiveBoard.create({
                data: {
                    eventId: event.id,
                    title: `Festive Board - ${event.title}`,
                    description: `Festive board for ${event.title}`,
                    date: event.startDate,
                    location: event.location,
                    maxParticipants: 30
                }
            });
            console.log('Created festive board for event:', event.title);
        }
    }

    console.log('Dashboard data seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding dashboard data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 