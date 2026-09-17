export async function onRequestPost({ request, env }) {
  try {
    const { task_id, seller_name } = await request.json();

    if (!task_id || !seller_name) {
      return new Response(JSON.stringify({ error: "Parameter tidak lengkap." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update status hanya jika tugas masih 'OPEN'
    const query = `
      UPDATE tasks 
      SET status = 'TAKEN', taken_by = ?, taken_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND status = 'OPEN'
    `;

    const result = await env.DB.prepare(query).bind(seller_name, task_id).run();

    // Jika changes == 0, berarti tugas sudah bukan 'OPEN' (keduluan orang lain)
    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ 
        error: "Tugas sudah diambil oleh seller lain!" 
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Berhasil mengambil tugas!` 
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
