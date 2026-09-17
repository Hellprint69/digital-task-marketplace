export async function onRequestGet({ env }) {
  try {
    // Ambil data tasks beserta ID dan pengirim pesan terakhir
    const query = `
      SELECT 
        t.*,
        m.id AS last_msg_id,
        m.sender_name AS last_msg_sender
      FROM tasks t
      LEFT JOIN task_messages m ON m.id = (
        SELECT id FROM task_messages 
        WHERE task_id = t.id 
        ORDER BY id DESC 
        LIMIT 1
      )
      ORDER BY t.id DESC
    `;

    const { results } = await env.DB.prepare(query).all();

    return new Response(JSON.stringify(results || []), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
