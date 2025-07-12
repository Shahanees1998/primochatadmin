const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function flagMessages() {
    try {
        // Get some existing messages
        const messages = await prisma.message.findMany({
            take: 5,
            include: {
                sender: true
            }
        });

        if (messages.length === 0) {
            console.log('No messages found. Please create some messages first.');
            return;
        }

        // Flag some messages for testing
        const flagReasons = ['INAPPROPRIATE', 'SPAM', 'HARASSMENT', 'OFFENSIVE', 'OTHER'];
        
        for (let i = 0; i < Math.min(messages.length, 3); i++) {
            const message = messages[i];
            const flagReason = flagReasons[i % flagReasons.length];
            
            await prisma.message.update({
                where: { id: message.id },
                data: {
                    isFlagged: true,
                    flagReason: flagReason,
                    content: `${message.content} [FLAGGED: ${flagReason}]`
                }
            });
            
            console.log(`Flagged message ${message.id} with reason: ${flagReason}`);
        }

        console.log('Successfully flagged messages for testing moderation');
    } catch (error) {
        console.error('Error flagging messages:', error);
    } finally {
        await prisma.$disconnect();
    }
}

flagMessages(); 