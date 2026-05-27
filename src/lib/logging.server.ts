import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function saveGenerationToLog(
  url: string,
  character: string,
  ip: string,
  status = "generated",
) {
  const { error } = await supabaseAdmin.from("generations").insert({
    ip_address: ip,
    url,
    character,
    status,
  });
  if (error) {
    console.error("Failed to save generation to Supabase", error);
    throw error;
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

    return {
      totalUniqueUsers,
      totalGeneratingUsers,
      totalPaidUsers: 0,
      conversionRate: 0,
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
