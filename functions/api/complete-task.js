export async function onRequestPost({ request, env }) {
  try {
    const { task_id, buyer_name } = await request.json();

    if (!task_id || !buyer_name) {
      return new Response(JSON.stringify({ error: "Parameter tidak lengkap." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Pastikan yang menyelesaikan adalah buyer pembuat tugas
    const query = `
      UPDATE tasks 
      SET status = 'COMPLETED' 
      WHERE id = ? AND buyer_name = ? AND status = 'SUBMITTED'
    `;

    const result = await env.DB.prepare(query)
      .bind(task_id, buyer_name)
      .run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ 
        error: "Gagal menyelesaikan tugas. Hanya buyer terkait yang bisa konfirmasi!" 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Transaksi selesai! Terima kasih." }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
