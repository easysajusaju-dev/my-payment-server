const { buildSajuReport } = require("../lib/sajuEngine");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const body = req.body;
    const result = buildSajuReport(body);

    return res.status(200).json(result);
  } catch (err) {
    console.error("SAJU API ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
