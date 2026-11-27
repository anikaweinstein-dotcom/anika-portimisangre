// Pendientes del equipo del Club del Donante: leer, marcar, cambiar estado, agregar y quitar tareas.
// Solo con el PIN (variable CLUB_PIN en Vercel). Las tareas se guardan en un espacio PRIVADO de
// Vercel Blob (club/tareas.json), no en este repo. La primera vez se arma con CLUB_PENDIENTES.
const { put, get } = require("@vercel/blob");

const RUTA = "club/tareas.json";

function id(prefijo) {
  return prefijo + Math.random().toString(36).slice(2, 9);
}
function texto(v, max) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
}

function inicial() {
  let p = null;
  try { p = JSON.parse(process.env.CLUB_PENDIENTES || "null"); } catch (e) {}
  const grupos = ((p && p.grupos) || []).map(function (g, i) {
    return {
      id: "g" + i, titulo: g.titulo, pedido: g.pedido || "", nota: g.nota || "",
      items: (g.items || []).map(function (t) {
        return { id: id("t"), marca: t.marca, que: t.que || "", estado: t.estado || "", hecho: false };
      })
    };
  });
  return { grupos: grupos, actualizado: new Date().toISOString() };
}

async function leer() {
  let r;
  try {
    r = await get(RUTA, { access: "private", useCache: false });
  } catch (e) {
    if (e && e.name === "BlobNotFoundError") return inicial();
    throw e;
  }
  if (!r || r.statusCode === 404) return inicial();
  if (r.statusCode !== 200) throw new Error("No se pudo leer: " + r.statusCode);
  return JSON.parse(await new Response(r.stream).text());
}

async function guardar(doc) {
  doc.actualizado = new Date().toISOString();
  await put(RUTA, JSON.stringify(doc), {
    access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json"
  });
  return doc;
}

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const fin = function (code, obj) { res.statusCode = code; res.end(JSON.stringify(obj)); };
  if (req.method !== "POST") return fin(405, { error: "Usa POST" });

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const correcto = process.env.CLUB_PIN || "";
  if (!correcto || String(b.pin || "") !== correcto) {
    await new Promise(function (r) { setTimeout(r, 900); }); // frena a quien prueba PIN tras PIN
    return fin(401, { error: "PIN incorrecto" });
  }

  try {
    const doc = await leer();
    const op = b.op || "leer";
    if (op === "leer") {
      return fin(200, doc);
    }
    const g = doc.grupos.find(function (x) { return x.id === b.grupo; });
    if (!g) return fin(400, { error: "No encontré ese grupo" });

    if (op === "agregar") {
      const marca = texto(b.marca, 80);
      if (!marca) return fin(400, { error: "Escribe a quién hay que contactar" });
      g.items.push({ id: id("t"), marca: marca, que: texto(b.que, 240), estado: "Por contactar", hecho: false });
      return fin(200, await guardar(doc));
    }

    const t = g.items.find(function (x) { return x.id === b.id; });
    if (!t) return fin(400, { error: "No encontré esa tarea (quizás alguien la quitó)" });
    if (op === "marcar") {
      t.hecho = !!b.hecho;
    } else if (op === "estado") {
      t.estado = texto(b.estado, 140);
    } else if (op === "quitar") {
      g.items = g.items.filter(function (x) { return x.id !== t.id; });
    } else {
      return fin(400, { error: "No entendí qué cambiar" });
    }
    return fin(200, await guardar(doc));
  } catch (e) {
    console.error(e);
    return fin(500, { error: "No se pudo guardar. Prueba otra vez en un momento." });
  }
};
