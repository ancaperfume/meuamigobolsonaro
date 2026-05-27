import * as fs from "fs";
import * as path from "path";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const logPath = path.resolve(process.cwd(), "generations_log.json");

export function saveGenerationToLog(url: string, character: string, ip: string) {
  try {
    let logs = [];
    if (fs.existsSync(logPath)) {
      const fileContent = fs.readFileSync(logPath, "utf-8");
      if (fileContent.trim()) {
        logs = JSON.parse(fileContent);
      }
    }
    logs.push({
      url,
      character,
      ip,
      timestamp: new Date().toISOString(),
    });
    // Limit logs to last 1000 items
    if (logs.length > 1000) logs = logs.slice(-1000);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), "utf-8");
  } catch (logErr) {
    console.error("Failed to write local generations log", logErr);
  }
}

export async function readAllGenerations() {
  let localLogs = [];
  try {
    if (fs.existsSync(logPath)) {
      const fileContent = fs.readFileSync(logPath, "utf-8");
      if (fileContent.trim()) {
        localLogs = JSON.parse(fileContent);
      }
    }
  } catch (e) {
    console.error("Failed to read local generations log", e);
  }

  let dbLogs = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("generated_url, character, created_at, status")
      .not("generated_url", "is", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      dbLogs = data.map((o) => ({
        url: o.generated_url,
        character: o.character,
        ip: "Registro de Compra",
        timestamp: o.created_at,
        status: o.status,
      }));
    }
  } catch (dbErr) {
    console.error("Failed to fetch generations from orders", dbErr);
  }

  // Merge and sort by date descending
  const merged = [...localLogs, ...dbLogs].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // De-duplicate by URL to prevent duplicates
  const uniqueMap = new Map();
  for (const item of merged) {
    if (item.url && !uniqueMap.has(item.url)) {
      uniqueMap.set(item.url, item);
    }
  }

  return Array.from(uniqueMap.values());
}
