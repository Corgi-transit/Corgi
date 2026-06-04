export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'Missing from or to params' });
  }

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`;
    const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    res.status(200).json(data);
  } catch {
    res.status(502).json({ code: 'Error', message: 'Routing service unavailable' });
  }
}
