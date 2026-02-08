const socket = io();
const synth = window.speechSynthesis; // Web Speech API

// UI Elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const nicknameInput = document.getElementById('nickname');
const roomIDInput = document.getElementById('roomID');
const stage = document.getElementById('stage');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const userCountDisplay = document.getElementById('user-count');
const roomIDDisplay = document.getElementById('room-id-display');

let currentRoomID = '';
let myID = '';

// --- Login Logic ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nickname = nicknameInput.value;
    currentRoomID = roomIDInput.value || 'defaultRoom';
    if (nickname) {
        socket.emit('login', { nickname, roomID: currentRoomID });
    }
});

socket.on('loginSuccess', (users) => {
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    myID = socket.id;
    roomIDDisplay.textContent = currentRoomID;
    updateUsers(users);
});

// --- Chat & Speech Logic ---
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const text = chatInput.value;
    if (text) {
        socket.emit('message', { text });
        displayMessageBubble(myID, text, true); // Sender displays and speaks immediately
        chatInput.value = '';
    }
}

socket.on('message', (msg) => {
    // Other users receive and display the message, and speak it aloud
    displayMessageBubble(msg.senderId, msg.text, false);
});

function displayMessageBubble(userId, text, isSender) {
    const characterElement = document.getElementById(`char-${userId}`);
    if (!characterElement) return;

    // Speak the message using the Web Speech API
    if (!isSender && synth.speaking) {
        synth.cancel(); // Stop current speech if any
    }
    const utterance = new SpeechSynthesisUtterance(text);
    // Add logic here to select different voices if available
    synth.speak(utterance);

    // Create and manage the visual bubble
    const existingBubble = characterElement.querySelector('.speech-bubble');
    if (existingBubble) {
        existingBubble.remove();
    }

    const bubble = document.createElement('div');
    bubble.classList.add('speech-bubble');
    bubble.textContent = text;
    characterElement.appendChild(bubble);

    // Make the bubble disappear after 4 seconds
    setTimeout(() => {
        bubble.classList.add('hidden');
        setTimeout(() => {
            bubble.remove();
        }, 1000);
    }, 3000);
}


// --- Character Movement & Sync Logic ---

function createCharacterElement(id, user) {
    const charEl = document.createElement('div');
    charEl.id = `char-${id}`;
    charEl.classList.add('character');
    charEl.style.left = `${user.x}px`;
    charEl.style.top = `${user.y}px`;
    // Placeholder image URL
    const imageUrl = "https://via.placeholder.com"; // Generic placeholder
    charEl.innerHTML = `<img src="${imageUrl}" alt="Character" width="100"><div class="character-label">${user.nickname}</div>`;
    stage.appendChild(charEl);

    if (id === myID) {
        makeDraggable(charEl, id);
    }
}

function makeDraggable(element, id) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.style.cursor = 'grabbing';
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        element.style.top = `${newTop}px`;
        element.style.left = `${newLeft}px`;

        socket.emit('move', { x: newLeft, y: newTop });
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        element.style.cursor = 'grab';
    }
}

function updateUsers(users) {
    userCountDisplay.textContent = Object.keys(users).length;
    stage.innerHTML = '';
    for (const id in users) {
        createCharacterElement(id, users[id]);
    }
}

socket.on('userJoined', ({ id, user }) => {
    createCharacterElement(id, user);
    userCountDisplay.textContent = parseInt(userCountDisplay.textContent) + 1;
});

socket.on('userLeft', (id) => {
    const charEl = document.getElementById(`char-${id}`);
    if (charEl) {
        charEl.remove();
        userCountDisplay.textContent = parseInt(userCountDisplay.textContent) - 1;
    }
});

socket.on('userMoved', ({ id, position }) => {
    if (id !== myID) {
        const charEl = document.getElementById(`char-${id}`);
        if (charEl) {
            charEl.style.left = `${position.x}px`;
            charEl.style.top = `${position.y}px`;
        }
    }
});
