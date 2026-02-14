export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' });
  }

  const body = req.body;
  if (!body || !body.model) {
    return res.status(400).json({ error: 'Missing request body or model' });
  }

  // Inject vector store IDs for file_search tools if configured server-side
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  if (vectorStoreId && Array.isArray(body.tools)) {
    for (const tool of body.tools) {
      if (tool.type === 'file_search' && !tool.vector_store_ids) {
        tool.vector_store_ids = [vectorStoreId];
      }
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[API PROXY] Error:', err.message);
    return res.status(502).json({ error: 'Failed to reach OpenAI API' });
  }
}
