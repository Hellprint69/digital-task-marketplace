export async function onRequestPost({ request, env }) {
  try {
    const { task_id, buyer_name } = await request.json();

    if (!task_id || !buyer_name) {
      return new Response(JSON.stringify({ error: "Parameter tidak lengkap." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Ambil detail tugas untuk tahu budget dan siapa sellernya
    const task = await env.DB.prepare("SELECT * FROM tasks WHERE id = ? AND buyer_name = ? AND status = 'SUBMITTED'")
      .bind(task_id, buyer_name)
      .first();

    if (!task) {
      return new Response(JSON.stringify({ 
        error: "Tugas tidak ditemukan atau belum dalam status verifikasi akun!" 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Batch: Update status jadi COMPLETED dan kirim saldo ke seller
    await env.DB.batch([
      env.DB.prepare("UPDATE tasks SET status = 'COMPLETED' WHERE id = ?").bind(task_id),
      env.DB.prepare("UPDATE users SET balance = balance + ? WHERE username = ?").bind(task.budget, task.taken_by)
    ]);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Transaksi selesai! Dana Rp ${task.budget.toLocaleString("id-ID")} telah diteruskan ke ${task.taken_by}.` 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
