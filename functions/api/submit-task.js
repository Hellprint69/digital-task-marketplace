export async function onRequestPost({ request, env }) {
  try {
    const { task_id, seller_name, submission_data } = await request.json();

    if (!task_id || !seller_name || !submission_data) {
      return new Response(JSON.stringify({ error: "Data pengiriman tidak boleh kosong!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Pastikan yang submit adalah seller yang mengambil tugas tersebut
    const query = `
      UPDATE tasks 
      SET status = 'SUBMITTED', submission_data = ?, submitted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND taken_by = ? AND status = 'TAKEN'
    `;

    const result = await env.DB.prepare(query)
      .bind(submission_data.trim(), task_id, seller_name)
      .run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ 
        error: "Gagal mengirim data! Pastikan tugas ini memang kamu yang mengambil." 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Data akun berhasil diserahkan ke buyer!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
