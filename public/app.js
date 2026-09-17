let currentUser = document.getElementById("user-select").value;

document.getElementById("user-select").addEventListener("change", (e) => {
  currentUser = e.target.value;
  fetchTasks();
});

// Kontrol Modal
function openModal() {
  document.getElementById("task-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("task-modal").classList.add("hidden");
  document.getElementById("create-task-form").reset();
}

// Fetch & Render Kartu Tugas
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
          <p class="text-slate-500 text-xs mt-1">Gunakan tombol "Buat Tugas" di atas untuk menambahkan tugas baru.</p>
        </div>
      `;
      return;
    }

    tasks.forEach(task => {
      const isTaken = task.status === "TAKEN";
      const isTakenByMe = isTaken && task.taken_by === currentUser;

      const card = document.createElement("div");
      card.className = `group bg-slate-800/60 border ${
        isTaken ? "border-slate-800/80 opacity-80" : "border-slate-700/60 hover:border-indigo-500/50"
      } rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5`;

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start gap-2 mb-3">
            <span class="text-[11px] tracking-wide font-bold px-2.5 py-1 rounded-md ${
              isTaken ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }">
              ${isTaken ? "SEDANG DIKERJAKAN" : "TERSEDIA"}
            </span>
            <span class="font-extrabold text-emerald-400 text-lg tracking-tight">
              Rp ${Number(task.budget).toLocaleString("id-ID")}
            </span>
          </div>

          <h3 class="font-bold text-white text-base leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
            ${task.title}
          </h3>
          <p class="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-3">
            ${task.description || "Tidak ada rincian spesifikasi khusus."}
          </p>
        </div>

        <div class="pt-4 border-t border-slate-800/80">
          <div class="flex items-center justify-between text-[11px] text-slate-400 mb-3">
            <span>Pemesan: <strong class="text-slate-300 font-semibold">${task.buyer_name}</strong></span>
          </div>

          ${
            !isTaken
              ? `<button onclick="claimTask(${task.id})" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
                  Ambil Tugas Ini
                 </button>`
              : isTakenByMe
              ? `<div class="space-y-2">
                  <div class="text-[11px] text-indigo-300 font-semibold text-center bg-indigo-950/40 border border-indigo-500/20 py-1.5 rounded-lg">
                    Tugas ini kamu yang ambil
                  </div>
                  <button class="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl transition shadow-lg shadow-emerald-600/20">
                    Kirim Data Akun
                  </button>
                 </div>`
              : `<div class="text-center py-2 bg-slate-800/40 rounded-xl text-slate-400 text-xs border border-slate-800">
                  🔒 Diambil oleh <span class="font-bold text-slate-300">${task.taken_by}</span>
                 </div>`
          }
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `<div class="col-span-full text-rose-400 text-xs text-center">Gagal memuat tugas: ${err.message}</div>`;
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
      body: JSON.stringify({
        task_id: taskId,
        seller_name: currentUser
      })
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
    alert("Kesalahan koneksi: " + err.message);
  }
}

// Form Submit Buyer
async function handleCreateTask(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-submit-task");
  btn.disabled = true;
  btn.innerText = "Memproses...";

  const title = document.getElementById("task-title").value;
  const budget = document.getElementById("task-budget").value;
  const description = document.getElementById("task-desc").value;

  try {
    const res = await fetch("/api/create-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        budget,
        description,
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
    btn.innerText = "Posting Sekarang";
  }
}

// Load awal
fetchTasks();
