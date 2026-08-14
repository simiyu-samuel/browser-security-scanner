export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    scanner: "SENTINEL",
    version: "1.0",
    database: false,
    thirdPartyTracking: false,
    purpose: "serverless security metadata endpoint",
    note: "This endpoint intentionally performs no target probing and stores no visitor data."
  });
}