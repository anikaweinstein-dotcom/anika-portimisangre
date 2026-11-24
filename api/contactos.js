// Devuelve los contactos de las marcas del Club del Donante SOLO con el PIN correcto.
// El PIN y los contactos NO están en este repo (es público): viven en Vercel como
// variables de entorno CLUB_PIN y CLUB_CONTACTOS (JSON). Para cambiarlos, editarlos en Vercel.
module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Usa POST" }));
  }
  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  var pin = String((body && body.pin) || "");
  var correcto = process.env.CLUB_PIN || "";
  // Pausa en cada intento para que no se pueda probar PIN tras PIN rápido.
  await new Promise(function (r) { setTimeout(r, 900); });
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!correcto || pin !== correcto) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: "PIN incorrecto" }));
  }
  var contactos = {};
  try { contactos = JSON.parse(process.env.CLUB_CONTACTOS || "{}"); } catch (e) {}
  res.statusCode = 200;
  res.end(JSON.stringify({ contactos: contactos }));
};
