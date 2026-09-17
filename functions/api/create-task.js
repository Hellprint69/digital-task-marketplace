export async function onRequestPost({ request, env }) {
  try {
    const { title, description, budget, buyer_name } = await request.json();
    const taskBudget = parseInt(budget);

    if (!title || !budget || !buyer_name || taskBudget <= 0) {
      return new Response(JSON.stringify({ error: "Data tugas tidak lengkap atau budget tidak valid!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Cek saldo buyer
    const buyer = await env.DB.prepare("SELECT balance FROM users WHERE username = ?")
      .bind(buyer_name)
      .first();

    if (!buyer || buyer.balance < taskBudget) {
      return new Response(JSON.stringify({ 
        error: `Saldo tidak mencukupi! Saldo Anda: Rp ${(buyer?.balance || 0).toLocaleString("id-ID")}` 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Transaksi database: potong saldo buyer dan buat tugas
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET balance = balance - ? WHERE username = ?").bind(taskBudget, buyer_name),
      env.DB.prepare(`
        INSERT INTO tasks (title, description, budget, status, buyer_name, created_at)
        VALUES (?, ?, ?, 'OPEN', ?, CURRENT_TIMESTAMP)
      `).bind(title.trim(), description ? description.trim() : "", taskBudget, buyer_name.trim())
    ]);

    return new Response(JSON.stringify({ success: true, message: "Tugas berhasil diposting & saldo di-hold sistem!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
