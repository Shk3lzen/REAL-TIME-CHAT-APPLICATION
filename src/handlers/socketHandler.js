const redisHandler = require('./redisHandler');

const users = {};

function init(io, redis) {
    io.on('connection', (socket) => {
        // Helper function for emitting messages to the room
        const emitRoomMessage = (room, message) => {
            io.to(room).emit('message', message);
        };

        // Join room
        socket.on('joinRoom', async ({ username, room }) => {
            socket.username = username;
            socket.room = room;
            users[username] = socket.id;

            if (!(await redisHandler.userExists(username))) {
                await redisHandler.addUser(username);
                socket.emit('userStatus', { status: 'created', message: `New user ${username} created.` });
            }

            socket.join(room);
            io.emit('updateUsers', await redisHandler.getUsers());

            const messages = await redisHandler.getMessages(room, 1);
            messages.reverse().forEach(msg => socket.emit('message', msg));

            emitRoomMessage(room, {
                user: 'System',
                text: `${username} has joined ${room}`,
                time: new Date().toLocaleTimeString()
            });
        });

        // Direct message
        socket.on('directMessage', async ({ targetUser, message }) => {
            const sender = socket.username;
            const msg = {
                user: sender,
                targetUser,
                text: message,
                time: new Date().toLocaleTimeString(),
                type: 'private'
            };

            await redisHandler.saveDirectMessage(sender, targetUser, msg);

            if (users[targetUser]) {
                io.to(users[targetUser]).emit('directMessage', msg);
            }

            socket.emit('directMessage', msg);
        });

        // Load direct messages
        socket.on('loadDirectMessages', async ({ sender, receiver, page }) => {
            const messages = await redisHandler.getDirectMessages(sender, receiver, page);
            socket.emit('loadDirectMessages', messages);
        });

        // Load messages
        socket.on('loadMessages', async ({ room, page, olderMessages }) => {
            try {
                const messages = olderMessages
                    ? await redisHandler.loadOlderMessages(room)
                    : await redisHandler.getMessages(room, page);

                socket.emit('olderMessages', messages);
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        });

        // Request private room
        socket.on('requestPrivateRoom', async ({ username, targetUser }) => {
            const privateRoom = [username, targetUser].sort().join('_');
            if (!(await redisHandler.roomExists(privateRoom))) {
                await redisHandler.createRoom(privateRoom);
            }

            socket.join(privateRoom);

            if (users[targetUser]) {
                io.to(users[targetUser]).emit('privateRoomCreated', privateRoom);
                emitRoomMessage(privateRoom, {
                    user: 'System',
                    text: `Private chat started between ${username} and ${targetUser}.`,
                    time: new Date().toLocaleTimeString()
                });
            }

            const messages = await redisHandler.getMessages(privateRoom, 1);
            messages.reverse().forEach(msg => socket.emit('message', msg));
        });

        // Private message
        socket.on('privateMessage', async ({ targetUser, message }) => {
            const room = [socket.username, targetUser].sort().join('_');
            const msg = {
                user: socket.username,
                text: message,
                time: new Date().toLocaleTimeString()
            };

            await redisHandler.saveMessage(room, msg);
            emitRoomMessage(room, msg);
        });

        // Leave room
        socket.on('leaveRoom', ({ username, room }) => {
            if (socket.username === username && socket.room === room) {
                emitRoomMessage(room, {
                    user: 'System',
                    text: `${username} has left the room.`,
                    time: new Date().toLocaleTimeString()
                });
                socket.leave(room);
                socket.username = null;
                socket.room = null;
            }
        });

        // Send message
        socket.on('sendMessage', async (message) => {
            const msgData = {
                user: socket.username,
                text: message,
                time: new Date().toLocaleTimeString()
            };
            emitRoomMessage(socket.room, msgData);
            await redisHandler.saveMessage(socket.room, msgData);
        });

        // Typing indicator
        socket.on('typing', () => {
            socket.broadcast.to(socket.room).emit('typing', `${socket.username} is typing...`);
        });

        // Get all users
        socket.on('getAllUsers', async () => {
            const usersList = await redisHandler.getUsers();
            socket.emit('userList', usersList);
        });

        // Create room
        socket.on('createRoom', async (roomName) => {
            const roomCreated = await redisHandler.createRoom(roomName);
            if (roomCreated) {
                socket.emit('roomCreated');
                const rooms = await redisHandler.getAllRooms();
                io.emit('roomsList', rooms);
            } else {
                socket.emit('message', { user: 'System', text: `Room "${roomName}" already exists.` });
            }
        });

        // Get all rooms
        socket.on('getAllRooms', async () => {
            const rooms = await redisHandler.getAllRooms();
            socket.emit('roomsList', rooms);
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (socket.room && socket.username) {
                emitRoomMessage(socket.room, {
                    user: 'System',
                    text: `${socket.username} has disconnected from room: ${socket.room}`,
                    time: new Date().toLocaleTimeString()
                });
            }
        });
    });
}

module.exports = { init };
