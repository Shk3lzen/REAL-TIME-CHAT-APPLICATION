const redisHandler = require('./redisHandler');

const users = {};

function init(io, redis) {
    io.on('connection', (socket) => {
        socket.on('joinRoom', async ({ username, room }) => {
            socket.username = username;
            socket.room = room;
            users[username] = socket.id;

            const userExists = await redisHandler.userExists(username);
            if (!userExists) {
                await redisHandler.addUser(username);
                socket.emit('userStatus', { status: 'created', message: `New user ${username} created.` });
            }

            socket.join(room);
            io.emit('updateUsers', await redisHandler.getUsers());
            const messages = await redisHandler.getMessages(room, 1);
            messages.reverse().forEach(msg => socket.emit('message', msg));

            const welcomeMessage = {
                user: 'System',
                text: `${username} has joined ${room}`,
                time: new Date().toLocaleTimeString()
            };
            io.to(room).emit('message', welcomeMessage);
        });

        socket.on('loadMessages', async ({ room, page }) => {
            try {
                const messages = await redisHandler.getMessages(room, page);
                console.log("Fetched messages from Redis:", messages); // Add a debug log
                socket.emit('olderMessages', messages.reverse());
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        });
        socket.on('requestPrivateRoom', async ({ username, targetUser }) => {
            const privateRoom = [username, targetUser].sort().join('_');
            const roomExists = await redisHandler.roomExists(privateRoom); // Assuming this method exists
            if (!roomExists) {
                await redisHandler.createRoom(privateRoom); // Create the room in your data store
            }
        
            socket.join(privateRoom);
            if (users[targetUser]) {
                io.to(users[targetUser]).emit('privateRoomCreated', privateRoom);
                const welcomeMessage = {
                    user: 'System',
                    text: `Private chat started between ${username} and ${targetUser}.`,
                    time: new Date().toLocaleTimeString()
                };
                io.to(privateRoom).emit('message', welcomeMessage);
            }

            const messages = await redisHandler.getMessages(privateRoom, 1);
            messages.reverse().forEach(msg => socket.emit('message', msg));
        });

        socket.on('privateMessage', async ({ targetUser, message }) => {
            const room = [socket.username, targetUser].sort().join('_');
            const msg = {
                user: socket.username,
                text: message,
                time: new Date().toLocaleTimeString()
            };

            await redisHandler.saveMessage(room, msg);
            io.to(users[targetUser] || '').to(socket.id).emit('message', msg);
        });

        socket.on('leaveRoom', ({ username, room }) => {
            if (socket.username === username && socket.room === room) {
                io.to(room).emit('message', { user: 'System', text: `${username} has left the room.`, time: new Date().toLocaleTimeString() });
                socket.leave(room);
                socket.username = null;
                socket.room = null;
            }
        });

        socket.on('sendMessage', async (message) => {
            const msgData = {
                user: socket.username,
                text: message,
                time: new Date().toLocaleTimeString()
            };
            io.to(socket.room).emit('message', msgData);
            await redisHandler.saveMessage(socket.room, msgData);
        });

        socket.on('typing', () => {
            socket.broadcast.to(socket.room).emit('typing', `${socket.username} is typing...`);
        });

        socket.on('getAllUsers', async () => {
            const usersList = await redisHandler.getUsers();
            console.log(usersList);
            
            socket.emit('userList', usersList);
        });

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
        
        socket.on('getAllRooms', async () => {
            const rooms = await redisHandler.getAllRooms();
            socket.emit('roomsList', rooms);
        });

        socket.on('disconnect', () => {
            if (socket.room && socket.username) {
                io.to(socket.room).emit('message', { user: 'System', text: `${socket.username} has disconnected from room: ${socket.room}`, time: new Date().toLocaleTimeString() });
            }
        });
    });
}

module.exports = {
    init
};