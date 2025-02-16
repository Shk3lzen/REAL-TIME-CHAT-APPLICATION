const socket = io();
let currentRoom = 'main';
let currentPage = 0;
const pageSize = 10;
let username = localStorage.getItem('chatUsername') || '';  // Get username from localStorage or set to empty string

// Helper function to update room display
function updateCurrentRoomDisplay(room) {
    document.getElementById('currentRoomName').textContent = room;
}

// Initialization on page load
window.onload = function() {
    if (!currentRoom) {
        currentRoom = 'main';
    }
    updateCurrentRoomDisplay(currentRoom);
    if (username) {
        joinRoom();
    } else {
        document.getElementById('chat').classList.add('d-none');
        document.getElementById('joinForm').style.display = 'block';
    }
};

// Function to join room
function joinRoom(room = currentRoom) {
    if (!username) {
        const enteredUsername = document.getElementById('username').value.trim();
        if (!enteredUsername) return alert('Please enter a username!');
        username = enteredUsername;
        localStorage.setItem('chatUsername', username);
    }

    document.getElementById('usernameDisplay').textContent = username;
    document.getElementById('currentUser').classList.remove('d-none');

    socket.emit('leaveRoom', { username, room: currentRoom });
    socket.emit('joinRoom', { username, room });
    currentRoom = room;
    document.getElementById('messages').innerHTML = '';
    currentPage = 0;

    document.getElementById('chat').classList.remove('d-none');
    document.getElementById('joinForm').style.display = 'none';
    updateCurrentRoomDisplay(currentRoom);
}

// Function to create a new room
function createRoom() {
    const roomName = document.getElementById('newRoomName').value.trim();
    if (roomName) {
        socket.emit('createRoom', roomName);
        document.getElementById('newRoomName').value = '';
    } else {
        alert('Please enter a room name!');
    }
}

// Function to start or join a private chat
function startPrivateChat(targetUser) {
    const privateRoom = [username, targetUser].sort().join('_');
    currentRoom = privateRoom;
    socket.emit('createRoom', privateRoom);
    socket.emit('joinRoom', { username, room: privateRoom });
    document.getElementById('messages').innerHTML = `Private chat with ${targetUser}`;
    socket.emit('requestPrivateRoom', { username, targetUser });
}

// Function to display a message in the chat
function displayMessage(msg, prepend = false) {
    const li = document.createElement('div');
    li.className = 'message';
    li.innerHTML = `<span class="timestamp">[${msg.time}]</span>
                    <span class="${msg.user === 'System' ? 'system' : 'user'}">
                        ${msg.user}: ${msg.text}
                    </span>`;

    const messageContainer = document.getElementById('messages');
    prepend ? messageContainer.prepend(li) : messageContainer.appendChild(li);
}

// Send a message
function sendMessage() {
    const message = document.getElementById('message').value;
    if (message.trim() !== '') {
        if (currentRoom.includes('_')) {
            const targetUser = currentRoom.replace(username + '_', '').replace('_' + username, '');
            socket.emit('privateMessage', { targetUser, message });
        } else {
            socket.emit('sendMessage', message);
        }
        document.getElementById('message').value = '';
    }
}

// Event listeners
document.getElementById('message').addEventListener('keypress', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Socket event listeners
socket.on('newRoom', (roomName) => {
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

socket.on('updateUsers', (users) => {
    const userRoom = document.getElementById('userRoom');
    userRoom.innerHTML = '';
    users.filter(user => user !== username).forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        li.className = 'user-item text-primary mb-2';
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => startPrivateChat(user));
        userRoom.appendChild(li);
    });
});

socket.on('roomsList', (rooms) => {
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';
    ['main', ...rooms].filter((room, index, self) => self.indexOf(room) === index).forEach(room => {
        const li = document.createElement('li');
        li.textContent = room;
        li.className = 'room-item text-primary mb-2';
        li.style.cursor = 'pointer';
        li.onclick = () => joinRoom(room);
        roomList.appendChild(li);
    });
});

socket.on('message', displayMessage);
socket.on('olderMessages', messages => messages.reverse().forEach(msg => displayMessage(msg, true)));

// Typing indicator
function showTyping() {
    socket.emit('typing');
}

socket.on('typing', (text) => {
    document.getElementById('typing').innerText = text;
    setTimeout(() => document.getElementById('typing').innerText = '', 2000);
});

// Load older messages
function loadOlderMessages() {
    currentPage++;
    socket.emit('loadMessages', { room: currentRoom, page: currentPage, olderMessages: true });
}

// Initial requests
socket.emit('getAllRooms');