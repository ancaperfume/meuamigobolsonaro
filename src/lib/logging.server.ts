import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function saveGenerationToLog(
  url: string,
  character: string,
  ip: string,
  status = "generated",
) {
  try {
    const { error } = await supabaseAdmin.from("generations").insert({
      ip_address: ip,
      url,
      character,
      status,
    });
    if (error) console.error("Failed to save generation to Supabase", error);
  } catch (err) {
    console.error("Failed to save generation log", err);
  }
}

export async function readAllGenerations() {
  const generations: {
    url: string;
    character: string;
    ip: string;
    timestamp: string;
    status: string;
  }[] = [];

  // 1. Read from Supabase generations table
  try {
    const { data: genRows, error: genErr } = await supabaseAdmin
      .from("generations")
      .select("url, character, ip_address, created_at, status")
      .order("created_at", { ascending: false });
    if (!genErr && genRows) {
      for (const row of genRows) {
        generations.push({
          url: row.url || "",
          character: row.character || "",
          ip: row.ip_address,
          timestamp: row.created_at,
          status: row.status,
        });
      }
    } else if (genErr) {
      console.error("Error reading generations table", genErr);
    }
  } catch (e) {
    console.error("Failed to read generations from Supabase", e);
  }

  // 2. Merge orders that have generated_url (paid orders with images)
  try {
    const { data: orderRows, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("character, generated_url, created_at, status, ip_address")
      .not("generated_url", "is", null)
      .order("created_at", { ascending: false });
    if (!orderErr && orderRows) {
      for (const row of orderRows) {
        // Avoid duplicates by URL
        const exists = generations.some((g) => g.url === row.generated_url);
        if (!exists && row.generated_url) {
          generations.push({
            url: row.generated_url,
            character: row.character || "",
            ip: row.ip_address || "",
            timestamp: row.created_at,
            status: row.status === "paid" ? "paid" : "generated",
          });
        }
      }
    } else if (orderErr) {
      console.error("Error reading orders table", orderErr);
    }
  } catch (e) {
    console.error("Failed to read orders from Supabase", e);
  }

  // Sort newest first
  generations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return generations;
}

export async function getUserPhotosByIP(ip: string) {
  const photos: {
    url: string;
    character: string;
    timestamp: string;
    status: string;
  }[] = [];

  try {
    const { data: genRows, error: genErr } = await supabaseAdmin
      .from("generations")
      .select("url, character, created_at, status")
      .eq("ip_address", ip)
      .not("url", "is", null)
      .order("created_at", { ascending: false });
    if (!genErr && genRows) {
      for (const row of genRows) {
        if (row.url) {
          photos.push({
            url: row.url,
            character: row.character || "",
            timestamp: row.created_at,
            status: row.status,
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to read user generations", e);
  }

  try {
    const { data: orderRows, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("character, generated_url, created_at, status")
      .eq("ip_address", ip)
      .not("generated_url", "is", null)
      .order("created_at", { ascending: false });
    if (!orderErr && orderRows) {
      for (const row of orderRows) {
        const exists = photos.some((p) => p.url === row.generated_url);
        if (!exists && row.generated_url) {
          photos.push({
            url: row.generated_url,
            character: row.character || "",
            timestamp: row.created_at,
            status: row.status === "paid" ? "paid" : "generated",
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to read user orders", e);
  }

  photos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return photos;
}

export async function getAdminStats() {
  try {
    // Count unique IPs from generations table
    const { data: genIPs, error: genErr } = await supabaseAdmin
      .from("generations")
      .select("ip_address");

    if (genErr) console.error("Error fetching generations for stats", genErr);

    const allIPs = new Set<string>((genIPs || []).map((r: any) => r.ip_address).filter(Boolean));
    const totalUniqueUsers = allIPs.size;
    const totalGeneratingUsers = genIPs?.length ?? 0;

    // Count paid orders
    const { data: allOrders, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("status");

    if (orderErr) console.error("Error fetching orders for stats", orderErr);

    const totalPaidUsers = allOrders?.filter((o: any) => o.status === "paid").length ?? 0;

    return {
      totalUniqueUsers,
      totalGeneratingUsers,
      totalPaidUsers,
      conversionRate:
        totalGeneratingUsers > 0
          ? Number(((totalPaidUsers / totalGeneratingUsers) * 100).toFixed(2))
          : 0,
    };
  } catch (err) {
    console.error("Failed to compute admin stats", err);
    return {
      totalUniqueUsers: 0,
      totalGeneratingUsers: 0,
      totalPaidUsers: 0,
      conversionRate: 0,
    };
  }
}
