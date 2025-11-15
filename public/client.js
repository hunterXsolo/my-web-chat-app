// public/client.js
const socket = io();
let username = "";
let room = "";

// ----- Simple XOR encryption (learning/demo only) -----
function encryptMessage(msg, key) {
  if (!key) return btoa(msg);
  let out = '';
  for (let i = 0; i < msg.length; i++) {
    out += String.fromCharCode(msg.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(out);
}

function decryptMessage(encoded, key) {
  try {
    const decoded = atob(encoded);
    if (!key) return decoded;
    let out = '';
    for (let i = 0; i < decoded.length; i++) {
      out += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return out;
  } catch (e) {
    return '[decode error]';
  }
}

// UI elements
const joinScreen = document.getElementById('joinScreen');
const chatScreen = document.getElementById('chatScreen');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const sendBtn = document.getElementById('sendBtn');
const nameInput = document.getElementById('name');
const roomInput = document.getElementById('room');
const msgInput = document.getElementById('messageInput');
const messagesEl = document.getElementById('messages');
const topInfo = document.getElementById('topInfo');

// helpers
function showJoin() {
  joinScreen.classList.remove('hidden');
  chatScreen.classList.add('hidden');
  topInfo.textContent = '';
  messagesEl.innerHTML = '';
  msgInput.value = '';
}
function showChat() {
  joinScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  topInfo.textContent = `${username} — ${room}`;
  msgInput.focus();
}

// add message DOM
function addMessageDOM({ text, who = 'other', name = '', time = Date.now(), isSystem = false }) {
  const el = document.createElement('div');
  if (isSystem) {
    el.className = 'system';
    el.textContent = `${text} · ${new Date(time).toLocaleTimeString()}`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return;
  }

  el.className = 'msg ' + (who === 'me' ? 'me' : 'other');

  // main text
  const p = document.createElement('div');
  p.textContent = text;
  el.appendChild(p);

  // meta (name/time)
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = `${who === 'me' ? 'You' : name} • ${new Date(time).toLocaleTimeString()}`;
  el.appendChild(meta);

  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// join
joinBtn.addEventListener('click', () => {
  username = nameInput.value.trim();
  room = roomInput.value.trim();

  if (!username || !room) {
    alert('Please enter name and room');
    return;
  }

  socket.emit('join', { username, room });
  showChat();
});

// leave
leaveBtn.addEventListener('click', () => {
  if (!room) return;
  socket.emit('leave', room);
  username = '';
  room = '';
  showJoin();
});

// send (button)
sendBtn.addEventListener('click', sendMessage);

// send (enter)
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !room) return;

  const encrypted = encryptMessage(text, room);

  socket.emit('chat-message', {
    username,
    room,
    message: encrypted
  });

  addMessageDOM({ text, who: 'me', name: username, time: Date.now() });
  msgInput.value = '';
}

// receive chat message
socket.on('chat-message', (data) => {
  // ignore our own echoed message (server broadcasts to all)
  // but server sends id, so check
  if (data.id === socket.id) return;

  // decrypt
  const plain = decryptMessage(data.message, room);
  addMessageDOM({ text: plain, who: 'other', name: data.username, time: data.time });
});

// system messages (join/leave/disconnect)
socket.on('system-message', (data) => {
  addMessageDOM({ text: data.message, isSystem: true, time: data.time });
});

// initial screen
showJoin();
