import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const QUESTS_DB_ID = "b9f25082-f57d-4691-8042-bb96ba68bba4";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await notion.databases.query({
      database_id: QUESTS_DB_ID,
      filter: {
        or: [
          { property: "Status", select: { equals: "Open" } },
          { property: "Status", select: { equals: "In Progress" } }
        ]
      },
      sorts: [{ property: "Priority", direction: "ascending" }]
    });

    const quests = response.results.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        quest: p.Quest?.title?.[0]?.plain_text || "(Untitled)",
        category: p.Category?.select?.name || null,
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
