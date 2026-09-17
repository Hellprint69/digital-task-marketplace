let currentUser = document.getElementById("user-select").value;
let chatPollingInterval = null;

// Helper: ambil ID pesan terakhir yang sudah dibaca dari localStorage
function getReadMsgId(taskId) {
  const key = `read_msg_${currentUser}_${taskId}`;
  return parseInt(localStorage.getItem(key) || "0");
}

// Helper: tandai pesan di tugas ini sudah dibaca
function setReadMsgId(taskId, lastMsgId) {
  const key = `read_msg_${currentUser}_${taskId}`;
  localStorage.setItem(key, (lastMsgId || 0).toString());
}

document.getElementById("user-select").addEventListener("change", (e) => {
  currentUser = e.target.value;
  fetchTasks();
});

// Modal Kontrol Task & Submit
function openModal() { document.getElementById("task-modal").classList.remove("hidden"); }
function closeModal() {
  document.getElementById("task-modal").classList.add("hidden");
  document.getElementById("create-task-form").reset();
}

function openSubmitModal(taskId) {
  document.getElementById("submit-task-id").value = taskId;
  document.getElementById("submit-modal").classList.remove("hidden");
}
function closeSubmitModal() {
  document.getElementById("submit-modal").classList.add("hidden");
  document.getElementById("submit-data-form").reset();
}

// Modal Kontrol Chat
function openChatModal(taskId, taskTitle, lastMsgId) {
  document.getElementById("chat-task-id").value = taskId;
  document.getElementById("chat-modal-title").innerText = `Diskusi: ${taskTitle}`;
  document.getElementById("chat-modal").classList.remove("hidden");

  // Tandai sudah dibaca saat modal dibuka
  if (lastMsgId) {
    setReadMsgId(taskId, lastMsgId);
  }

  loadMessages(taskId);

  // Auto-refresh chat tiap 3 detik selama modal terbuka
  if (chatPollingInterval) clearInterval(chatPollingInterval);
  chatPollingInterval = setInterval(() => {
    loadMessages(taskId, false);
  }, 3000);

  // Re-render kartu agar titik merah hilang
  fetchTasks();
}

function closeChatModal() {
  document.getElementById("chat-modal").classList.add("hidden");
  document.getElementById("chat-form").reset();
  if (chatPollingInterval) {
    clearInterval(chatPollingInterval);
    chatPollingInterval = null;
  }
}

// Fetch & Render Pesan Chat
async function loadMessages(taskId, showLoading = true) {
  const box = document.getElementById("chat-messages-box");
  if (showLoading) {
    box.innerHTML = `<div class="text-center text-slate-500 py-6">Memuat obrolan...</div>`;
  }

  try {
    const res = await fetch(`/api/messages?task_id=${taskId}`);
    const messages = await res.json();

    if (!messages || messages.length === 0) {
      box.innerHTML = `<div class="text-center text-slate-500 py-8">Belum ada obrolan. Mulai diskusi di bawah!</div>`;
      return;
    }

    box.innerHTML = "";
    let maxId = 0;

    messages.forEach(msg => {
      if (msg.id > maxId) maxId = msg.id;
      const isMe = msg.sender_name === currentUser;
      const msgEl = document.createElement("div");
      msgEl.className = `flex flex-col ${isMe ? "items-end" : "items-start"}`;

      msgEl.innerHTML = `
        <span class="text-[10px] text-slate-400 mb-0.5 px-1">${msg.sender_name}</span>
        <div class="max-w-[80%] rounded-2xl px-3 py-2 text-xs break-words ${
          isMe 
            ? "bg-indigo-600 text-white rounded-br-xs shadow-sm" 
            : "bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-xs"
        }">
          ${msg.message}
        </div>
      `;
      box.appendChild(msgEl);
    });

    // Update read tracker saat chat aktif
    if (maxId > 0) {
      setReadMsgId(taskId, maxId);
    }

    if (showLoading) {
      box.scrollTop = box.scrollHeight;
    }
  } catch (err) {
    if (showLoading) {
      box.innerHTML = `<div class="text-center text-rose-400 py-4">Gagal memuat pesan: ${err.message}</div>`;
    }
  }
}

// Kirim Pesan Chat
async function handleSendMessage(e) {
  e.preventDefault();
  const taskId = document.getElementById("chat-task-id").value;
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  const btn = document.getElementById("btn-send-chat");

  if (!message) return;

  btn.disabled = true;
  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: parseInt(taskId),
        sender_name: currentUser,
        message: message
      })
    });

    if (res.ok) {
      input.value = "";
      await loadMessages(taskId, false);
      const box = document.getElementById("chat-messages-box");
      box.scrollTop = box.scrollHeight;
    } else {
      alert("Gagal mengirim pesan!");
    }
  } catch (err) {
    alert("Error chat: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

// Fetch & Render Tugas
async function fetchTasks() {
  const container = document.getElementById("task-list");
  const icon = document.getElementById("refresh-icon");
  if (icon) icon.classList.add("animate-spin");

  try {
    const res = await fetch("/api/tasks");
    const tasks = await res.json();

    container.innerHTML = "";

    if (!tasks || tasks.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-slate-800/30 border border-slate-800 rounded-2xl p-8 text-center">
          <p class="text-slate-400 font-medium">Belum ada tugas yang tersedia.</p>
        </div>
      `;
      return;
    }

    tasks.forEach(task => {
      const isTaken = task.status === "TAKEN";
      const isSubmitted = task.status === "SUBMITTED";
      const isCompleted = task.status === "COMPLETED";

      const isMyTaskAsBuyer = task.buyer_name === currentUser;
      const isMyTaskAsSeller = task.taken_by === currentUser;

      // Logika Titik Merah (Unread indicator):
      // Ada pesan baru jika task punya pesan, pengirim terakhir BUKAN current user, dan ID pesan > yang tersimpan di localStorage
      const lastReadId = getReadMsgId(task.id);
      const hasUnread = task.last_msg_id && 
                        task.last_msg_sender !== currentUser && 
                        task.last_msg_id > lastReadId;

      // Status Badge
      let statusBadge = "";
      if (task.status === "OPEN") {
        statusBadge = `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2.5 py-1 rounded-md">TERSEDIA</span>`;
      } else if (isTaken) {
        statusBadge = `<span class="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold px-2.5 py-1 rounded-md">DIKERJAKAN</span>`;
      } else if (isSubmitted) {
        statusBadge = `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold px-2.5 py-1 rounded-md">AKUN DIKIRIM</span>`;
      } else if (isCompleted) {
        statusBadge = `<span class="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[11px] font-bold px-2.5 py-1 rounded-md">SELESAI</span>`;
      }

      const card = document.createElement("div");
      card.className = `bg-slate-800/60 border ${
        isCompleted ? "border-slate-800 opacity-60" : "border-slate-700/60"
      } rounded-2xl p-5 flex flex-col justify-between transition-all`;

      // Submission Area
      let submissionSection = "";
      if ((isSubmitted || isCompleted) && (isMyTaskAsBuyer || isMyTaskAsSeller)) {
        submissionSection = `
          <div class="my-3 p-3 bg-slate-950/80 border border-slate-700 rounded-xl">
            <div class="text-[11px] text-slate-400 font-semibold mb-1 flex justify-between">
              <span>Data Akun dari Seller:</span>
              <span class="text-indigo-400 font-mono text-[10px]">${task.taken_by}</span>
            </div>
            <pre class="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all select-all">${task.submission_data || "Tidak ada detail."}</pre>
          </div>
        `;
      }

      // Action Button Logic
      let actionHtml = "";
      if (task.status === "OPEN") {
        actionHtml = `
          <button onclick="claimTask(${task.id})" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20">
            Ambil Tugas Ini
          </button>
        `;
      } else if (isTaken) {
        if (isMyTaskAsSeller) {
          actionHtml = `
            <button onclick="openSubmitModal(${task.id})" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20">
              Kirim Detail Akun
            </button>
          `;
        } else {
          actionHtml = `
            <div class="text-center py-2 bg-slate-800/40 rounded-xl text-slate-400 text-xs border border-slate-800">
              🔒 Dikerjakan oleh <span class="font-bold text-slate-300">${task.taken_by}</span>
            </div>
          `;
        }
      } else if (isSubmitted) {
        if (isMyTaskAsBuyer) {
          actionHtml = `
            <button onclick="completeTask(${task.id})" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20">
              ✓ Konfirmasi Akun Sesuai (Selesai)
            </button>
          `;
        } else if (isMyTaskAsSeller) {
          actionHtml = `
            <div class="text-center py-2 bg-blue-950/40 rounded-xl text-blue-400 text-xs border border-blue-900/40">
              Menunggu konfirmasi dari Buyer
            </div>
          `;
        } else {
          actionHtml = `
            <div class="text-center py-2 bg-slate-800/40 rounded-xl text-slate-500 text-xs">
              Sedang dalam verifikasi oleh buyer
            </div>
          `;
        }
      } else if (isCompleted) {
        actionHtml = `
          <div class="text-center py-2 bg-slate-900/50 rounded-xl text-slate-400 text-xs">
            ✓ Transaksi telah berhasil diselesaikan
          </div>
        `;
      }

      // Tombol Chat dengan indikator Titik Merah
      const redDotHtml = hasUnread ? `
        <span class="relative flex h-2 w-2 mr-1">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
      ` : "";

      const chatBtnHtml = `
        <button onclick="openChatModal(${task.id}, '${task.title.replace(/'/g, "\\'")}', ${task.last_msg_id || 0})" 
                class="w-full mt-2 py-2 rounded-xl border ${
                  hasUnread ? "border-rose-500/40 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10" : "border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
                } text-xs font-medium transition flex items-center justify-center gap-1.5 relative">
          ${redDotHtml}
          <span>💬</span> Diskusi / Chat
          ${hasUnread ? '<span class="text-[10px] text-rose-400 font-bold ml-1">(Pesan Baru)</span>' : ''}
        </button>
      `;

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start gap-2 mb-3">
            ${statusBadge}
            <span class="font-extrabold text-emerald-400 text-lg">
              Rp ${Number(task.budget).toLocaleString("id-ID")}
            </span>
          </div>

          <h3 class="font-bold text-white text-base leading-snug mb-2">${task.title}</h3>
          <p class="text-slate-400 text-xs leading-relaxed mb-2">${task.description || "Tidak ada rincian spesifikasi."}</p>
          
          ${submissionSection}
        </div>

        <div class="pt-3 border-t border-slate-800/80">
          <div class="flex items-center justify-between text-[11px] text-slate-400 mb-3">
            <span>Pemesan: <strong class="text-slate-300">${task.buyer_name}</strong></span>
            ${task.taken_by ? `<span>Seller: <strong class="text-slate-300">${task.taken_by}</strong></span>` : ""}
          </div>
          ${actionHtml}
          ${chatBtnHtml}
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `<div class="col-span-full text-rose-400 text-xs text-center">Gagal memuat: ${err.message}</div>`;
  } finally {
    if (icon) icon.classList.remove("animate-spin");
  }
}

// Ambil Tugas
async function claimTask(taskId) {
  if (!confirm(`Ambil tugas ini atas nama ${currentUser}?`)) return;

  try {
    const res = await fetch("/api/claim-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, seller_name: currentUser })
    });

    const result = await res.json();
    if (res.ok) {
      alert("Tugas berhasil kamu ambil!");
      fetchTasks();
    } else {
      alert(result.error || "Gagal mengambil tugas!");
      fetchTasks();
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Buyer Membuat Tugas Baru
async function handleCreateTask(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-submit-task");
  btn.disabled = true;

  try {
    const res = await fetch("/api/create-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.getElementById("task-title").value,
        budget: document.getElementById("task-budget").value,
        description: document.getElementById("task-desc").value,
        buyer_name: currentUser
      })
    });

    const result = await res.json();
    if (res.ok) {
      closeModal();
      fetchTasks();
    } else {
      alert(result.error || "Gagal membuat tugas.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

// Seller Kirim Akun
async function handleSubmitAccount(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-submit-account");
  btn.disabled = true;

  const taskId = document.getElementById("submit-task-id").value;
  const submissionData = document.getElementById("submission-data").value;

  try {
    const res = await fetch("/api/submit-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: parseInt(taskId),
        seller_name: currentUser,
        submission_data: submissionData
      })
    });

    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      closeSubmitModal();
      fetchTasks();
    } else {
      alert(result.error || "Gagal mengirim akun.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

// Buyer Konfirmasi Selesai
async function completeTask(taskId) {
  if (!confirm("Pastikan akun sudah dicek dan sesuai. Selesaikan pesanan?")) return;

  try {
    const res = await fetch("/api/complete-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: taskId,
        buyer_name: currentUser
      })
    });

    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      fetchTasks();
    } else {
      alert(result.error || "Gagal konfirmasi tugas.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Polling auto-refresh daftar tugas tiap 10 detik agar titik merah otomatis muncul jika ada pesan masuk
setInterval(() => {
  fetchTasks();
}, 10000);

// Load Awal
fetchTasks();
