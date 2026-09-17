export async function onRequestPost({ request, env }) {
  try {
    const { title, description, budget, buyer_name } = await request.json();

    if (!title || !budget || !buyer_name) {
      return new Response(JSON.stringify({ error: "Judul, budget, dan nama buyer wajib diisi!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const query = `
      INSERT INTO tasks (title, description, budget, status, buyer_name, created_at)
      VALUES (?, ?, ?, 'OPEN', ?, CURRENT_TIMESTAMP)
    `;

    await env.DB.prepare(query)
      .bind(title.trim(), description ? description.trim() : "", parseInt(budget), buyer_name.trim())
      .run();

    return new Response(JSON.stringify({ success: true, message: "Tugas berhasil diposting!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
