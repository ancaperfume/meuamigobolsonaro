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
      .select("generated_url, character, created_at, status, ip_address")
      .not("generated_url", "is", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      dbLogs = data.map((o) => ({
        url: o.generated_url,
        character: o.character,
        ip: o.ip_address || "Registro de Compra",
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

export async function getAdminStats() {
  try {
    // 1. Get all orders
    const { data: allOrders, error } = await supabaseAdmin
      .from("orders")
      .select("ip_address, status, generated_url, character");

    if (error) {
      console.error("Error fetching all orders for stats", error);
    }

    // 2. Get all rows from generations table
    let genIPs: string[] = [];
    try {
      const { data: allGenerations, error: genError } = await supabaseAdmin
        .from("generations")
        .select("ip_address");
      
      if (!genError && allGenerations) {
        genIPs = allGenerations.map(g => g.ip_address).filter(Boolean);
      }
    } catch (genTableErr) {
      console.warn("Generations table query failed, skipping:", genTableErr);
    }

    // 3. Read local logs IP
    let localIPs: string[] = [];
    try {
      const logPath = path.resolve(process.cwd(), "generations_log.json");
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

    // Combine all IPs to Set for unique visitor counts
    const allIPs = new Set<string>();
    allOrders?.forEach(o => { if (o.ip_address) allIPs.add(o.ip_address); });
    genIPs.forEach(ip => allIPs.add(ip));
    localIPs.forEach(ip => allIPs.add(ip));

    const totalUniqueUsers = allIPs.size;

    // Users who generated photos (i.e. have a record in generations, local logs, or an order with non-null generated_url or status = 'generated_preview')
    const generatingIPs = new Set<string>();
    genIPs.forEach(ip => generatingIPs.add(ip));
    localIPs.forEach(ip => generatingIPs.add(ip));
    allOrders?.forEach(o => {
      if (o.ip_address && (o.generated_url || o.status === "generated_preview")) {
        generatingIPs.add(o.ip_address);
      }
    });

    const totalGeneratingUsers = generatingIPs.size;

    // Users who purchased (status = 'paid')
    const paidIPs = new Set<string>();
    allOrders?.forEach(o => {
      if (o.ip_address && o.status === "paid") {
        paidIPs.add(o.ip_address);
      }
    });
    const totalPaidUsers = paidIPs.size;

    return {
      totalUniqueUsers,         // total unique visitor IPs interacting
      totalGeneratingUsers,     // total unique IPs that generated at least one photo
      totalPaidUsers,           // total unique IPs that paid
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

