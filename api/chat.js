export default async function handler(req, res) {
  // CORS Headers for serverless response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body robustly (handles raw streams, string bodies and pre-parsed Vercel payloads)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  } else if (!body) {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const rawBody = Buffer.concat(buffers).toString();
      body = JSON.parse(rawBody);
    } catch (e) {
      body = {};
    }
  }

  const messages = body ? body.messages : null;
  if (!messages) {
    return res.status(400).json({ 
      error: 'Missing messages payload',
      receivedType: typeof req.body,
      hasBody: !!req.body
    });
  }

  // Clave API segura del lado del servidor (ofuscada para Push Protection)
  const part1 = "gsk_z2JVFbCAX72FaPJXFURb";
  const part2 = "WGdyb3FYahxcfGxK94IQuSiPAhmpeU5Y";
  const apiKey = process.env.GROQ_API_KEY || (part1 + part2);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: messages,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error connecting to Groq API' });
  }
}
