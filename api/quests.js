const DATA_SOURCE_ID = "a672470d-ecf0-49c5-afac-2b3ceee7c331";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET - Fetch open quests with Hub Category
  if (req.method === "GET") {
    try {
      const r = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2025-09-03",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filter: {
            or: [
              { property: "Status", select: { equals: "Open" } },
              { property: "Status", select: { equals: "In Progress" } }
            ]
          },
          sorts: [{ property: "Priority", direction: "ascending" }]
        })
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Notion error');

      const quests = (data.results || []).map(page => {
        const p = page.properties;
        return {
          id: page.id,
          quest: p.Quest?.title?.[0]?.plain_text || "(Untitled)",
          category: p.Category?.select?.name || null,
          hubCategory: p["Hub Category"]?.select?.name || null,
          priority: p.Priority?.select?.name || null,
          status: p.Status?.select?.name || null,
          nextStep: p["Next Step"]?.rich_text?.[0]?.plain_text || "",
          url: page.url
        };
      });

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ quests, count: quests.length });
    } catch (error) {
      console.error("Notion API error:", error);
      res.status(500).json({ error: "Failed to fetch quests", message: error.message });
    }
  }

  // POST - Mark quest as Done
  else if (req.method === "POST") {
    const { questId } = req.body;
    if (!questId) return res.status(400).json({ error: "questId required" });

    try {
      // Update the page's Status to "Done"
      const updateRes = await fetch(`https://api.notion.com/v1/pages/${questId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2025-09-03",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            "Status": { select: { name: "Done" } }
          }
        })
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.message || 'Update failed');
      }

      res.status(200).json({ success: true, questId });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Failed to update quest", message: error.message });
    }
  }

  else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
