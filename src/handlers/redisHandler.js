const Redis = require('ioredis');

const pub = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});

const sub = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});

const store = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});
  

const PAGE_SIZE = 10;

// Function to subscribe to room messages
function subscribeToRoom(room) {
    sub.subscribe(`room:${room}`);
}

// Function to unsubscribe from room messages
function unsubscribeFromRoom(room) {
    sub.unsubscribe(`room:${room}`);
}

// Handle messages from Redis
sub.on('message', (channel, message) => {
    const room = channel.split(':')[1];
    console.log(`Received message in room: ${room}`, message);
});

async function getAllRooms() {
    const keys = await store.keys('messages:*');
    return keys.map(key => key.replace('messages:', ''));
}

async function getMessages(room, page = 1) {
    const start = -(page * PAGE_SIZE);
    const end = start + PAGE_SIZE - 1;
    const messages = await store.lrange(`messages:${room}`, start, end);
    return messages.map(JSON.parse);
}

async function createRoom(roomName) {
    const roomKey = `messages:${roomName}`;
    if (!await this.roomExists(roomKey)) {
        await this.saveMessage(roomName, { user: 'System', text: `Room "${roomName}" created.` });
        return true;
    }
    return false;
}

async function roomExists(roomKey) {
    return await store.exists(roomKey);
}

async function saveMessage(room, message) {
    // Store the message for retrieval
    await store.rpush(`messages:${room}`, JSON.stringify(message));
    // Publish the message to the room channel for real-time updates
    await pub.publish(`room:${room}`, JSON.stringify(message));
}

async function addUser(username) {
    await store.sadd('users', username);
}

async function userExists(username) {
    return await store.sismember('users', username);
}

async function getUsers() {
    return await store.smembers('users');
}

module.exports = {
    init: () => ({ pub, sub, store }),
    getAllRooms,
    getMessages,
    saveMessage,
    addUser,
    userExists,
    getUsers,
    subscribeToRoom,
    unsubscribeFromRoom,
    roomExists,
    createRoom,
};