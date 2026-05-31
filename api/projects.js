import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = "50561100-b68c-4292-89db-59fb32b53161";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [
        { property: "Status", direction: "ascending" },
        { property: "Priority", direction: "ascending" }
      ]
    });

    const projects = response.results.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        Project: props.Project?.title?.[0]?.plain_text || "(Untitled)",
        Status: props.Status?.select?.name || "Unknown",
        Priority: props.Priority?.select?.name || "ONGOING",
        "Due Date": props["Due Date"]?.date?.start || null,
        "Days Left": props["Days Left"]?.formula?.number || null,
        "Next Action": props["Next Action"]?.rich_text?.[0]?.plain_text || "",
        Notes: props.Notes?.rich_text?.[0]?.plain_text || "",
        "Concept Type": props["Concept Type"]?.multi_select?.map(t => t.name) || [],
        url: page.url
      };
    });

    res.setHeader("Cache-Control", "max-age=300, s-maxage=300");
    res.status(200).json({ projects, count: projects.length });
  } catch (error) {
    console.error("Notion API error:", error);
    res.status(500).json({ 
      error: "Failed to fetch projects",
      message: error.message 
    });
  }
}
