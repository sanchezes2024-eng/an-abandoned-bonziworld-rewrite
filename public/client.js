const socket = io();

// UI Elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const stage = document.getElementById('stage');
const chatInput = document.getElementById('chat-input');
const userCountDisplay = document.getElementById('user-count');
const roomIDDisplay = document.getElementById('room-id-display');

let myID = '';

// --- Login Logic ---
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
    
    // Create all existing users
    for (const id in users) {
        createCharacter(id, users[id]);
    }
    updateUserCount(Object.keys(users).length);
});

// --- Chat & speak.js Logic ---
document.getElementById('send-button').addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') sendMessage(); 
});

function sendMessage() {
    const text = chatInput.value.trim();
    if (text) {
        socket.emit('message', { text });
        chatInput.value = '';
    }
}

socket.on('message', (msg) => {
    const charEl = document.getElementById(`char-${msg.senderId}`);
    if (charEl) {
        // 1. Trigger speak.js robotic voice
        try {
            speak(msg.text, { pitch: 50, speed: 175, amplitude: 100 });
        } catch(e) { console.error("speak.js error:", e); }
        
        // 2. Visual Speech Bubble
        const existingBubble = charEl.querySelector('.speech-bubble');
        if (existingBubble) existingBubble.remove();

        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = msg.text;
        charEl.appendChild(bubble);

        // Remove bubble after 4 seconds
        setTimeout(() => {
            bubble.style.opacity = '0';
            setTimeout(() => bubble.remove(), 1000);
        }, 3000);
    }
});

// --- Character & Draggable Fixes ---
function createCharacter(id, user) {
    if (document.getElementById(`char-${id}`)) return;

    const char = document.createElement('div');
    char.id = `char-${id}`;
    char.className = 'character';
    char.style.left = `${user.x}px`;
    char.style.top = `${user.y}px`;
    
    // Using a simple purple square as a placeholder for the gorilla
    char.innerHTML = `
        <div class="gorilla-placeholder" style="width:80px;height:80px;background:#6a0dad;border-radius:10px;"></div>
        <div class="character-label">${user.nickname}</div>
    `;
    stage.appendChild(char);

    // ONLY make your own character draggable
    if (id === myID) {
        char.style.zIndex = "100";
        makeDraggable(char);
    }
}

function makeDraggable(el) {
    let isDragging = false;

    el.onmousedown = (e) => {
        isDragging = true;
        el.style.cursor = 'grabbing';
        
        const shiftX = e.clientX - el.getBoundingClientRect().left;
        const shiftY = e.clientY - el.getBoundingClientRect().top;

        function moveAt(clientX, clientY) {
            let x = clientX - shiftX;
            let y = clientY - shiftY;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            // Emit coordinates to server so others see you move
            socket.emit('move', { x, y });
        }

        function onMouseMove(e) {
            if (!isDragging) return;
            moveAt(e.clientX, e.clientY);
        }

        document.addEventListener('mousemove', onMouseMove);

        document.onmouseup = () => {
            isDragging = false;
            el.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
        };
    };
    
    el.ondragstart = () => false; // Prevent default ghosting
}

// --- Sync Events ---
socket.on('userMoved', (data) => {
    const char = document.getElementById(`char-${data.id}`);
    if (char && data.id !== myID) { // Don't update your own position from server
        char.style.left = `${data.position.x}px`;
        char.style.top = `${data.position.y}px`;
    }
});

socket.on('userJoined', (data) => {
    createCharacter(data.id, data.user);
    updateUserCount(document.querySelectorAll('.character').length);
});

socket.on('userLeft', (id) => {
    const char = document.getElementById(`char-${id}`);
    if (char) char.remove();
    updateUserCount(document.querySelectorAll('.character').length);
});

function updateUserCount(count) {
    if (userCountDisplay) userCountDisplay.textContent = count;
}
