const socket = io();

/* ===== 상태 ===== */
let currentRoomId = null;
let nickname = localStorage.getItem("nickname") || "";

/* ===== DOM ===== */
const nicknameInput = document.querySelector(".nickname input");
const roomList = document.querySelector(".rooms ul");
const chatBox = document.querySelector(".chatbox");
const messageInput = document.querySelector(".input input");
const sendBtn = document.querySelector(".input button");
const usersList = document.querySelector(".users ul");

/* ===== 초기 ===== */
nicknameInput.value = nickname;
loadRooms();

/* ===== 유틸 ===== */
function addMessage(text) {
  const p = document.createElement("p");
  p.textContent = text;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ===== 닉네임 ===== */
document.querySelector(".nickname button").addEventListener("click", () => {
  nickname = nicknameInput.value.trim();
  if (!nickname) return alert("닉네임을 입력하세요");
  localStorage.setItem("nickname", nickname);
  alert("닉네임 저장됨");
});

/* ===== 방 목록 ===== */
async function loadRooms() {
  const res = await fetch("/rooms");
  const rooms = await res.json();

  roomList.innerHTML = "";
  rooms.forEach(room => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${room.name} by ${room.owner}
      <button data-id="${room.id}">입장</button>
      ${room.owner === nickname ? `<button class="danger" data-del="${room.id}">삭제</button>` : ""}
    `;
    roomList.appendChild(li);
  });
}

/* ===== 방 입장 ===== */
roomList.addEventListener("click", async e => {
  const joinId = e.target.dataset.id;
  const delId = e.target.dataset.del;

  /* 삭제 */
  if (delId) {
    await fetch("/delete-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: delId })
    });
    loadRooms();
    return;
  }

  /* 입장 */
  if (joinId) {
    const res = await fetch("/verify-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: joinId, password: prompt("비밀번호 (없으면 그냥 확인)") })
    });

    const result = await res.json();
    if (!result.success) return alert("비밀번호 오류");

    enterRoom(joinId);
  }
});

/* ===== 방 입장 처리 ===== */
function enterRoom(roomId) {
  if (!nickname) return alert("닉네임 먼저 설정하세요");

  currentRoomId = roomId;
  chatBox.innerHTML = "";

  socket.emit("joinRoom", {
    roomId,
    nickname
  });
}

/* ===== 메시지 전송 ===== */
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  if (!messageInput.value || !currentRoomId) return;

  socket.emit("chatMessage", {
    roomId: currentRoomId,
    nickname,
    message: messageInput.value
  });

  messageInput.value = "";
}

/* ===== Socket 이벤트 ===== */
socket.on("message", data => {
  addMessage(`${data.nickname}: ${data.message}`);
});

socket.on("system", msg => {
  addMessage(msg);
});

socket.on("roomUsers", users => {
  usersList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    usersList.appendChild(li);
  });
});
