let currentSeller = document.getElementById("seller-select").value;

// Update nama seller saat dropdown diganti
document.getElementById("seller-select").addEventListener("change", (e) => {
  currentSeller = e.target.value;
  fetchTasks();
});

async function fetchTasks() {
  const container = document.getElementById("task-list");

  try {
    const res = await fetch("/api/tasks");
    const tasks = await res.json();

    container.innerHTML = "";

    if (!tasks || tasks.length === 0) {
      container.innerHTML = `<p class="text-gray-500 col-span-2">Belum ada tugas yang tersedia.</p>`;
      return;
    }

    tasks.forEach(task => {
      const isTaken = task.status === "TAKEN";
      const isTakenByMe = isTaken && task.taken_by === currentSeller;

      const card = document.createElement("div");
      card.className = `p-5 rounded-xl border bg-white shadow-sm flex flex-col justify-between transition ${
        isTaken ? "border-gray-200 bg-gray-50" : "border-blue-200"
      }`;

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${
              isTaken ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
            }">
              ${isTaken ? "SEDANG DIKERJAKAN" : "TERSEDIA"}
            </span>
            <span class="font-bold text-emerald-600 text-lg">
              Rp ${Number(task.budget).toLocaleString("id-ID")}
            </span>
          </div>

          <h3 class="font-bold text-gray-900 text-lg mb-1">${task.title}</h3>
          <p class="text-gray-600 text-sm mb-3">${task.description || "Tidak ada rincian deskripsi."}</p>
          <div class="text-xs text-gray-400 mb-4">Diposting oleh: <span class="font-medium text-gray-600">${task.buyer_name}</span></div>
        </div>

        <div class="pt-3 border-t border-gray-100">
          ${
            !isTaken
              ? `<button onclick="claimTask(${task.id})" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition shadow-sm">
                  Ambil Tugas Ini
                 </button>`
              : isTakenByMe
              ? `<div class="space-y-2">
                  <div class="text-xs text-blue-600 font-semibold text-center">Tugas ini sedang kamu kerjakan</div>
                  <button class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition shadow-sm">
                    Kirim Detail Akun
                  </button>
                 </div>`
              : `<div class="text-center py-2 bg-gray-100 rounded-lg text-gray-500 text-sm">
                  🔒 Tugas sudah diambil oleh <span class="font-semibold text-gray-700">${task.taken_by}</span>
                 </div>`
          }
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `<p class="text-red-500 col-span-2">Gagal memuat tugas: ${err.message}</p>`;
  }
}

async function claimTask(taskId) {
  if (!confirm(`Ambil tugas ini sebagai ${currentSeller}?`)) return;

  try {
    const res = await fetch("/api/claim-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: taskId,
        seller_name: currentSeller
      })
    });

    const result = await res.json();

    if (res.ok) {
      alert(result.message);
      fetchTasks();
    } else {
      alert(result.error || "Gagal mengambil tugas.");
      fetchTasks();
    }
  } catch (err) {
    alert("Koneksi bermasalah: " + err.message);
  }
}

// Panggil saat pertama kali load
fetchTasks();
