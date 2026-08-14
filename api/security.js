export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    scanner: "SENTINEL",
    version: "2.1",
    database: false,
    thirdPartyTracking: false,
    purpose: "same-origin deployment health and security-header verification",
    note: "This endpoint intentionally performs no target probing and stores no visitor data.",
    method: req.method
  });
}
