let currentUser = document.getElementById("user-select").value;

document.getElementById("user-select").addEventListener("change", (e) => {
  currentUser = e.target.value;
  fetchTasks();
});

// Modal Kontrol
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

      // Status Badge Color & Text
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

      // Area data akun yang dikirim (hanya terlihat jika user adalah buyer pembuat atau seller yang ambil)
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

// Load Awal
fetchTasks();
