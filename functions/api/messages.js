export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get("task_id");

    if (!taskId) {
      return new Response(JSON.stringify({ error: "Parameter task_id wajib ada!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { results } = await env.DB.prepare(
      "SELECT * FROM task_messages WHERE task_id = ? ORDER BY id ASC"
    ).bind(parseInt(taskId)).all();

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

export async function onRequestPost({ request, env }) {
  try {
    const { task_id, sender_name, message } = await request.json();

    if (!task_id || !sender_name || !message || !message.trim()) {
      return new Response(JSON.stringify({ error: "Pesan tidak boleh kosong!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const query = `
      INSERT INTO task_messages (task_id, sender_name, message, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await env.DB.prepare(query)
      .bind(parseInt(task_id), sender_name.trim(), message.trim())
      .run();

    return new Response(JSON.stringify({ success: true, message: "Pesan terkirim!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
