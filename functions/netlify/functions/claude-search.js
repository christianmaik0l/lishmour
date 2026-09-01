// Función serverless de Netlify: recibe una petición del portal LISHMOR,
// llama a la API de Anthropic usando la API key guardada como variable de
// entorno en Netlify (nunca visible en el navegador) y regresa el texto.
//
// Requiere configurar en Netlify (Site settings -> Environment variables):
//   ANTHROPIC_API_KEY = tu-api-key-de-console.anthropic.com

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido, usa POST." })
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Netlify."
      })
    };
  }

  let prompt;
  try {
    const parsed = JSON.parse(event.body || "{}");
    prompt = parsed.prompt;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Cuerpo de la petición inválido (se esperaba JSON)." })
    };
  }

  if (!prompt || typeof prompt !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Falta el campo 'prompt' en la petición." })
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || data })
      };
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Error desconocido al llamar a Anthropic." })
    };
  }
};
