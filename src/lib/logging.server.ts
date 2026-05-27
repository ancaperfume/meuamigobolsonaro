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

  // De-duplicate by URL to prevent duplicates
  const uniqueMap = new Map();
  for (const item of localLogs) {
    if (item.url && !uniqueMap.has(item.url)) {
      uniqueMap.set(item.url, item);
    }
  }

  return Array.from(uniqueMap.values());
}

export async function getAdminStats() {
  try {
    const { data: allOrders, error } = await supabaseAdmin
      .from("orders")
      .select("status, generated_url");

    if (error) {
      console.error("Error fetching all orders for stats", error);
    }

    // Read local logs IP
    let localIPs: string[] = [];
    try {
      if (fs.existsSync(logPath)) {
        const fileContent = fs.readFileSync(logPath, "utf-8");
        if (fileContent.trim()) {
          const localLogs = JSON.parse(fileContent);
          localIPs = localLogs.map((l: any) => l.ip).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn("Failed to read local logs for stats", e);
    }

    const allIPs = new Set<string>(localIPs);

    const totalUniqueUsers = allIPs.size;

    const totalGeneratingUsers = localIPs.length;

    const totalPaidUsers = allOrders?.filter((o: any) => o.status === "paid").length ?? 0;

    return {
      totalUniqueUsers,
      totalGeneratingUsers,
      totalPaidUsers,
      conversionRate: totalGeneratingUsers > 0 ? Number(((totalPaidUsers / totalGeneratingUsers) * 100).toFixed(2)) : 0
    };
  } catch (err) {
    console.error("Failed to compute admin stats", err);
    return {
      totalUniqueUsers: 0,
      totalGeneratingUsers: 0,
      totalPaidUsers: 0,
      conversionRate: 0
    };
  }
}
