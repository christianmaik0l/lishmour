// Función serverless de Netlify: almacenamiento real compartido para LISHMOR
// (base de datos, monitoreo, personas/temas, medios y objetivos), usando
// Netlify Blobs. Esto reemplaza el almacenamiento de la vista previa de
// Claude (que no existe fuera de Claude.ai) por algo que sí persiste una
// vez publicado el sitio.

const { getStore } = require("@netlify/blobs");

exports.handler = async function (event) {
  let store;
  try {
    store = getStore({ name: "lishmor-data", consistency: "strong" });
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo inicializar el almacenamiento: " + err.message })
    };
  }

  if (event.httpMethod === "GET") {
    const key = event.queryStringParameters && event.queryStringParameters.key;
    if (!key) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta el parámetro 'key'." }) };
    }
    try {
      const value = await store.get(key);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: value === undefined ? null : value })
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: "Cuerpo inválido (se esperaba JSON)." }) };
    }
    const { key, value } = body;
    if (!key) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta 'key'." }) };
    }
    try {
      await store.set(key, value == null ? "" : value);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido." }) };
};
