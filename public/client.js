const socket = io();

// UI Elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const stage = document.getElementById('stage');
const chatInput = document.getElementById('chat-input');

let myID = '';

// --- Login ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nickname = document.getElementById('nickname').value;
    const roomID = document.getElementById('roomID').value || 'default';
    socket.emit('login', { nickname, roomID });
});

socket.on('loginSuccess', (users) => {
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    myID = socket.id;
    for (const id in users) createCharacter(id, users[id]);
});

// --- Chat & speak.js ---
document.getElementById('send-button').addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

function sendMessage() {
    const text = chatInput.value;
    if (text) {
        socket.emit('message', { text });
        chatInput.value = '';
    }
}

socket.on('message', (msg) => {
    const char = document.getElementById(`char-${msg.senderId}`);
    if (char) {
        // Use speak.js
        speak(msg.text, { pitch: 50, speed: 175, amplitude: 100 });
        
        // Show Bubble
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = msg.text;
        char.appendChild(bubble);
        setTimeout(() => bubble.remove(), 4000);
    }
});

// --- Draggable Logic ---
function createCharacter(id, user) {
    const char = document.createElement('div');
    char.id = `char-${id}`;
    char.className = 'character';
    char.style.left = `${user.x}px`;
    char.style.top = `${user.y}px`;
    char.innerHTML = `<div class="placeholder-img" style="width:80px;height:80px;background:purple"></div><span>${user.nickname}</span>`;
    stage.appendChild(char);

    if (id === myID) makeDraggable(char);
}

function makeDraggable(el) {
    el.onmousedown = (e) => {
        document.onmousemove = (ev) => {
            el.style.left = `${ev.clientX - 40}px`;
            el.style.top = `${ev.clientY - 40}px`;
            socket.emit('move', { x: ev.clientX - 40, y: ev.clientY - 40 });
        };
        document.onmouseup = () => document.onmousemove = null;
    };
}

socket.on('userMoved', (data) => {
    const char = document.getElementById(`char-${data.id}`);
    if (char) {
        char.style.left = `${data.position.x}px`;
        char.style.top = `${data.position.y}px`;
    }
});

socket.on('userJoined', (data) => createCharacter(data.id, data.user));
socket.on('userLeft', (id) => document.getElementById(`char-${id}`)?.remove());
