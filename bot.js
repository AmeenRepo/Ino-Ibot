const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysocket/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

// Function to start the bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    // Save credentials on changes
    sock.ev.on('creds.update', saveCreds);

    // Connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('opened connection');
        }
    });

    // Handling incoming messages
    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0];
        if (!message.message) return;

        const from = message.key.remoteJid;
        const messageContent = message.message.conversation || message.message.extendedTextMessage?.text;

        if (messageContent === 'ping') {
            const startTime = Date.now();
            await sock.sendMessage(from, { text: 'Pong!' });
            const endTime = Date.now();
            const speed = endTime - startTime;
            await sock.sendMessage(from, { text: `Bot speed: ${speed}ms` });
        } else if (messageContent === 'menu') {
            const commands = `Available commands:
            1. ping - Check bot speed
            2. menu - List available commands`;

            await sock.sendMessage(from, { text: commands });
        }
    });
}

// Start the bot
startBot();
