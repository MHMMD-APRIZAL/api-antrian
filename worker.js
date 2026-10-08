export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // 1. Ambil Semua Data Antrian
    if (action === "list") {
      const { results } = await env.DB.prepare("SELECT * FROM antrian ORDER BY created_at ASC").all();
      return Response.json({ status: "success", data: results }, { headers: corsHeaders });
    }

    // 2. Tambah Tiket Antrian Baru
    if (action === "create" && request.method === "POST") {
      const body = await request.json();
      const { name, pax, area, notes } = body;

      let prefix = "A";
      if (area === "Outdoor") prefix = "B";
      if (area === "VIP Lounge") prefix = "V";
      if (area === "Takeaway") prefix = "T";

      const countStmt = await env.DB.prepare("SELECT COUNT(*) as total FROM antrian").first();
      const nextNum = (countStmt.total || 0) + 1;
      const id = `${prefix}-${String(nextNum).padStart(2, '0')}`;
      const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      await env.DB.prepare(
        "INSERT INTO antrian (id, name, pax, area, notes, time, status) VALUES (?, ?, ?, ?, ?, ?, 'waiting')"
      ).bind(id, name, pax, area, notes || '', time).run();

      return Response.json({ status: "success", data: { id, time } }, { headers: corsHeaders });
    }

    // 3. Panggil Antrian Berikutnya / Khusus
    if (action === "call" && request.method === "POST") {
      const { id, destination } = await request.json();
      let targetId = id;

      if (!targetId) {
        const nextInLine = await env.DB.prepare("SELECT id FROM antrian WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 1").first();
        if (!nextInLine) {
          return Response.json({ status: "error", message: "Tidak ada antrian menunggu" }, { headers: corsHeaders });
        }
        targetId = nextInLine.id;
      }

      await env.DB.prepare("UPDATE antrian SET status = 'completed' WHERE status = 'calling'").run();
      await env.DB.prepare("UPDATE antrian SET status = 'calling', destination = ? WHERE id = ?").bind(destination, targetId).run();

      return Response.json({ status: "success" }, { headers: corsHeaders });
    }

    // 4. Update Status (Selesai / Dibatalkan)
    if (action === "update_status" && request.method === "POST") {
      const { id, status } = await request.json();
      await env.DB.prepare("UPDATE antrian SET status = ? WHERE id = ?").bind(status, id).run();
      return Response.json({ status: "success" }, { headers: corsHeaders });
    }

    // 5. Reset Antrian Hari Ini
    if (action === "reset" && request.method === "POST") {
      await env.DB.prepare("DELETE FROM antrian").run();
      return Response.json({ status: "success" }, { headers: corsHeaders });
    }

    return Response.json({ error: "Action not found" }, { status: 404, headers: corsHeaders });
  }
};
