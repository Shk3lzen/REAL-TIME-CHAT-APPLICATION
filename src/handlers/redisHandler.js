const Redis = require('ioredis');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};


const pub = new Redis(redisConfig);
const sub = new Redis(redisConfig);
const store = new Redis(redisConfig);

const PAGE_SIZE = 10;
let earliestMessageIndex = null;

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

// Retrieve all rooms
async function getAllRooms() {
    const keys = await store.keys('messages:*');
    return keys.map(key => key.replace('messages:', ''));
}

// Retrieve messages for a room with pagination
async function getMessages(room, page = 1) {
    const messages = await store.lrange(`messages:${room}`, -10, -1);
    if (messages.length === 0) return [];

    earliestMessageIndex = await store.llen(`messages:${room}`) - messages.length; // Track the earliest message
    return messages.map(JSON.parse).reverse(); // Oldest messages should appear first
}

// Load older messages for a room
async function loadOlderMessages(room) {
    if (earliestMessageIndex === null || earliestMessageIndex <= 0) return []; // No more older messages

    const start = Math.max(earliestMessageIndex - 10, 0); // Fetch older messages
    const end = earliestMessageIndex - 1;
    const messages = await store.lrange(`messages:${room}`, start, end);

    if (messages.length === 0) return [];

    earliestMessageIndex -= messages.length; // Update index for next load
    return messages.map(JSON.parse);
}

// Create a new room if it doesn't exist
async function createRoom(roomName) {
    const roomKey = `messages:${roomName}`;
    if (!await roomExists(roomKey)) {
        await saveMessage(roomName, { user: 'System', text: `Room "${roomName}" created.` });
        return true;
    }
    return false;
}

// Check if the room exists
async function roomExists(roomKey) {
    return await store.exists(roomKey);
}

// Save a message to a room and publish it
async function saveMessage(room, message) {
    await store.rpush(`messages:${room}`, JSON.stringify(message));
    await pub.publish(`room:${room}`, JSON.stringify(message));
}

// Add a new user to the system
async function addUser(username) {
    await store.sadd('users', username);
}

// Save a direct message between two users
async function saveDirectMessage(sender, receiver, message) {
    const key = `directMessages:${sender}:${receiver}`;
    await store.rpush(key, JSON.stringify(message));
}

// Load all pending direct messages for a user
async function loadPendingDirectMessages(username) {
    const keys = await store.keys(`directMessages:*:${username}`);
    let messages = [];
    for (let key of keys) {
        const msgs = await store.lrange(key, 0, -1);
        messages = messages.concat(msgs.map(JSON.parse));
    }
    return messages;
}

// Check if a user exists
async function userExists(username) {
    return await store.sismember('users', username);
}

// Retrieve all users in the system
async function getUsers() {
    return await store.smembers('users');
}

// Retrieve direct messages between two users with pagination
async function getDirectMessages(sender, receiver, page = 1) {
    const start = -(page * PAGE_SIZE);
    const end = start + PAGE_SIZE - 1;
    const key = `directMessages:${sender}:${receiver}`;
    const messages = await store.lrange(key, start, end);
    return messages.map(JSON.parse);
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
    saveDirectMessage,
    loadPendingDirectMessages,
    getDirectMessages,
    loadOlderMessages
};
