const socket = io();
let currentRoom = 'main';
let currentPage = 0;
const pageSize = 10;
let username = '';  // Try to get username from localStorage

// window.onload = function() {
//     const storedUsername = localStorage.getItem('chatUsername');
//     if (storedUsername) {
//         document.getElementById('username').value = storedUsername;
//         document.getElementById('usernameDisplay').textContent = storedUsername;
//         document.getElementById('currentUser').classList.remove('d-none');
//         joinRoom('main'); // Join the main room or last known room if available
//     }
// };

function startPrivateChat(targetUser) {
    // Create a unique room name by sorting and joining usernames
    const privateRoom = [username, targetUser].sort().join('_');
    currentRoom = privateRoom;
    
    // Emit event to create room on the server
    socket.emit('createRoom', privateRoom);

    // Join the private room
    socket.emit('joinRoom', { username, room: privateRoom });
    document.getElementById('messages').innerHTML = `Private chat with ${targetUser}`;

    // Request private room creation on the server
    socket.emit('requestPrivateRoom', { username, targetUser });

    // Listen for messages specifically for this private room
    socket.on('privateMessage', (data) => {
        if (data.room === privateRoom) {
            // Append the private message to the messages div
            const messageElement = document.createElement('div');
            messageElement.textContent = `${data.sender}: ${data.message}`;
            document.getElementById('messages').appendChild(messageElement);
        }
    });
}

function displayMessage(msg) {
    const li = document.createElement('div');
    li.className = 'message';
    li.innerHTML = `<span class="timestamp">[${msg.time}]</span><span class="${msg.user === 'System' ? 'system' : 'user'}">${msg.user}: ${msg.text}</span>`;
    document.getElementById('messages').appendChild(li);
}

function createRoom() {
    const roomName = document.getElementById('newRoomName').value.trim();
    if (roomName) {
        socket.emit('createRoom', roomName);
        document.getElementById('newRoomName').value = '';
        
    } else {
        alert('Please enter a room name!');
    }
}

function joinRoom(room = 'main') {
    if (!username) {
        const enteredUsername = document.getElementById('username').value.trim();
        if (!enteredUsername) {
            return alert('Please enter a username!');
        }
        username = enteredUsername;
        // localStorage.setItem('chatUsername', username);
    }
    
    // Update the user display in the header
    document.getElementById('usernameDisplay').textContent = username;
    document.getElementById('currentUser').classList.remove('d-none');

    socket.emit('leaveRoom', { username, room: currentRoom });
    socket.emit('joinRoom', { username, room });
    currentRoom = room;
    document.getElementById('messages').innerHTML = '';
    currentPage = 0;
    document.getElementById('chat').classList.remove('d-none');
    document.getElementById('joinForm').style.display = 'none'; // Hide join form
}
// Function to initialize the chat state on page load
// function initChat() {
//     if (username) {
//         // If there's a stored username, directly join the chat
//         joinRoom(currentRoom);
//     } else {
//         // If no username, show the join form
//         document.getElementById('chat').classList.add('d-none');
//         document.getElementById('joinForm').style.display = 'block';
//     }
// }

socket.on('newRoom', (roomName) => {
    // Check if the room is not already in the list to avoid duplicates
    const roomList = document.getElementById('roomList');
    if (!Array.from(roomList.children).some(li => li.textContent === roomName)) {
        const li = document.createElement('li');
        li.textContent = roomName;
        li.className = 'room-item text-primary mb-2';
        li.style.cursor = 'pointer';
        li.onclick = () => joinRoom(roomName);
        roomList.appendChild(li);
    }
});

// Call this function when the window loads
// window.onload = initChat;
function sendMessage() {
    const message = document.getElementById('message').value;
    if (message.trim() !== '') {
        if (currentRoom.includes('_')) {
            // If it's a private chat, emit as a private message
            const targetUser = currentRoom.replace(username + '_', '').replace('_' + username, '');
            socket.emit('privateMessage', { targetUser, message });
        } else {
            // Otherwise, it's a public room message
            socket.emit('sendMessage', message);
        }
        document.getElementById('message').value = '';
    }
}

socket.on('updateUsers', (users) => {
    const userRoom = document.getElementById('userRoom');
    userRoom.innerHTML = '';  // Clear existing list
    users.forEach(user => {
        if (user !== username) {
            const li = document.createElement('li');
            li.textContent = user;
            li.className = 'user-item text-primary mb-2';
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => startPrivateChat(user));
            userRoom.appendChild(li);
        }
    });
});

function showTyping() {
    socket.emit('typing');
}

function loadOlderMessages() {
    currentPage++;
    socket.emit('loadMessages', { room: currentRoom, page: currentPage });
}

socket.on('privateRoomCreated', (room) => {
    currentRoom = room;
});

socket.on('userList', (users) => {
    const userRoom = document.getElementById('userRoom');
    userRoom.innerHTML = '';
    users.sort().forEach(user => {
        if (user !== username) {
            const li = document.createElement('li');
            li.textContent = user;
            li.className = 'user-item text-primary mb-2';
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => startPrivateChat(user));
            userRoom.appendChild(li);
        }
    });
});

socket.on('roomsList', (rooms) => {
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = ''; // Clear existing list
    rooms.forEach(room => {
        const li = document.createElement('li');
        li.textContent = room;
        li.className = 'room-item text-primary mb-2';
        li.style.cursor = 'pointer';
        li.onclick = () => joinRoom(room);
        roomList.appendChild(li);
    });
});

socket.on('message', (msg) => {
    displayMessage(msg);
});

socket.on('typing', (text) => {
    document.getElementById('typing').innerText = text;
    setTimeout(() => {
        document.getElementById('typing').innerText = '';
    }, 2000);
});

socket.on('olderMessages', (messages) => {
    const messagesContainer = document.getElementById('messages');
    messages.reverse().forEach(displayMessage);
});

// Initial requests
socket.emit('getAllRooms');