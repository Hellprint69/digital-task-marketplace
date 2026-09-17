export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get("username");

    if (!username) {
      return new Response(JSON.stringify({ error: "Username wajib ada!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let user = await env.DB.prepare("SELECT * FROM users WHERE username = ?")
      .bind(username)
      .first();

    // Jika user belum ada di tabel, otomatis buatkan dengan saldo 0
    if (!user) {
      await env.DB.prepare("INSERT INTO users (username, balance) VALUES (?, 0)")
        .bind(username)
        .run();
      user = { username, balance: 0 };
    }

    return new Response(JSON.stringify(user), {
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

// Fitur Top Up Saldo simulasi
export async function onRequestPost({ request, env }) {
  try {
    const { username, amount } = await request.json();

    if (!username || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Nominal tidak valid!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE username = ?")
      .bind(parseInt(amount), username)
      .run();

    return new Response(JSON.stringify({ success: true, message: "Top up berhasil!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
