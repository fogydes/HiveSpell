import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BackupRequest {
  type: "daily" | "weekly" | "schema" | "full";
  tables?: string[];
  uploadToR2?: boolean; // Optional flag to also upload to Cloudflare R2
}

interface BackupResult {
  success: boolean;
  backupId: string;
  type: string;
  timestamp: string;
  sizeBytes?: number;
  durationMs: number;
  storagePath?: string;
  r2Path?: string;
  error?: string;
  metadata: BackupMetadata;
}

interface BackupMetadata {
  version: string;
  environment: string;
  tableCount: number;
  rowCounts: Record<string, number>;
  schemaVersion: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BACKUP_BUCKET = Deno.env.get("BACKUP_BUCKET") || "database-backups";
const APP_VERSION = Deno.env.get("APP_VERSION") || "dev";
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "production";

// Cloudflare R2 Configuration (optional - for off-site backups)
const R2_ENDPOINT = Deno.env.get("BACKUP_R2_ENDPOINT") || "";
const R2_BUCKET = Deno.env.get("BACKUP_R2_BUCKET") || "";
const R2_ACCESS_KEY_ID = Deno.env.get("BACKUP_R2_ACCESS_KEY_ID") || "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("BACKUP_R2_SECRET_ACCESS_KEY") || "";

// Extract account ID from endpoint if not provided directly
const R2_ACCOUNT_ID = R2_ENDPOINT.replace("https://", "").replace(".r2.cloudflarestorage.com", "");

async function getTableList(supabase: any): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_user_tables");
  if (error) throw error;
  return data.map((t: any) => t.table_name);
}

async function getRowCounts(supabase: any, tables: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (!error) counts[table] = count || 0;
    } catch {
      counts[table] = -1; // Could not count
    }
  }
  return counts;
}

async function getSchemaVersion(supabase: any): Promise<string> {
  const { data, error } = await supabase.from("schema_migrations").select("version").order("version", { ascending: false }).limit(1);
  if (error || !data?.length) return "unknown";
  return data[0].version;
}

async function createBackupDump(
  type: "daily" | "weekly" | "schema" | "full",
  tables?: string[],
): Promise<{ dump: Uint8Array; metadata: BackupMetadata }> {
  // Note: In a real implementation, you would use pg_dump via a separate process
  // Since Deno/Edge Functions can't run pg_dump directly, this is a placeholder
  // that creates a logical backup using Supabase REST API

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const allTables = tables || await getTableList(supabase);
  const rowCounts = await getRowCounts(supabase, allTables);
  const schemaVersion = await getSchemaVersion(supabase);

  const metadata: BackupMetadata = {
    version: APP_VERSION,
    environment: ENVIRONMENT,
    tableCount: allTables.length,
    rowCounts,
    schemaVersion,
  };

  // For data backups (daily/weekly/full), export table data as JSON
  // For schema backups, export schema definitions
  if (type === "schema") {
    // Schema backup - would need pg_dump in real implementation
    const dump = new TextEncoder().encode(JSON.stringify({
      type: "schema",
      tables: allTables,
      timestamp: new Date().toISOString(),
      metadata,
      note: "Schema backup requires pg_dump - use Supabase CLI for full schema export",
    }, null, 2));
    return { dump, metadata };
  }

  // Data backup - export all table data
  const backupData: Record<string, any[]> = {};
  for (const table of allTables) {
    try {
      let query = supabase.from(table).select("*");
      if (type === "daily") {
        // For daily, only get recent changes (last 24 hours)
        // This assumes tables have updated_at column
        query = query.gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      }
      const { data, error } = await query;
      if (!error && data) {
        backupData[table] = data;
      }
    } catch {
      // Table might not have updated_at or other issues
      backupData[table] = [];
    }
  }

  const dump = new TextEncoder().encode(JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    metadata,
    data: backupData,
  }, null, 2));

  return { dump, metadata };
}

async function uploadToStorage(
  dump: Uint8Array,
  backupId: string,
  type: string,
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const fileName = `${type}/${backupId}.json.gz`;
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(fileName, dump, {
      contentType: "application/gzip",
      upsert: false,
    });

  if (error) throw error;
  return fileName;
}

async function uploadToR2(
  dump: Uint8Array,
  backupId: string,
  type: string,
): Promise<string | null> {
  // Skip if R2 not configured
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    console.log("R2 not configured, skipping off-site upload");
    return null;
  }

  const fileName = `${type}/${backupId}.json.gz`;
  const r2Key = fileName; // R2 uses same path structure

  try {
    // Create AWS4 signature for R2 (S3-compatible)
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.slice(0, 8);
    const credentialScope = `${date}/auto/s3/aws4_request`;

    const headers: Record<string, string> = {
      "Host": `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      "Content-Type": "application/gzip",
      "X-Amz-Date": timestamp + "Z",
      "X-Amz-Content-Sha256": await sha256Hex(dump),
    };

    // Build canonical request
    const canonicalRequest = [
      "PUT",
      `/${R2_BUCKET}/${r2Key}`,
      "",
      Object.entries(headers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k.toLowerCase()}:${v}`)
        .join("\n"),
      "",
      Object.keys(headers).map(k => k.toLowerCase()).sort().join(";"),
      headers["X-Amz-Content-Sha256"],
    ].join("\n");

    // Create signature
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      timestamp + "Z",
      credentialScope,
      await sha256Hex(new TextEncoder().encode(canonicalRequest)),
    ].join("\n");

    const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, date, "auto", "s3");
    const signature = await hmacSha256Hex(signingKey, stringToSign);

    headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${Object.keys(headers).map(k => k.toLowerCase()).sort().join(";")}, Signature=${signature}`;

    // Upload to R2
    const response = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${r2Key}`, {
      method: "PUT",
      headers,
      body: dump,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`R2 upload failed: ${response.status} ${errorText}`);
    }

    console.log(`Backup uploaded to R2: ${r2Key}`);
    return r2Key;
  } catch (error) {
    console.error("R2 upload error:", error);
    // Don't throw - R2 upload failure shouldn't fail the entire backup
    return null;
  }
}

// Helper functions for AWS4 signing
async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === "string" ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(key: CryptoKey, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSigningKey(secretKey: string, date: string, region: string, service: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const kSecret = encoder.encode("AWS4" + secretKey);
  const kDate = await crypto.subtle.importKey("raw", kSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kRegion = await crypto.subtle.importKey("raw", await crypto.subtle.sign("HMAC", kDate, encoder.encode(date)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kService = await crypto.subtle.importKey("raw", await crypto.subtle.sign("HMAC", kRegion, encoder.encode(region)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kSigning = await crypto.subtle.importKey("raw", await crypto.subtle.sign("HMAC", kService, encoder.encode(service)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return kSigning;
}

function generateBackupId(type: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${type}-${timestamp}`;
}

async function logBackupResult(result: BackupResult): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  await supabase.from("backup_logs").insert({
    backup_id: result.backupId,
    type: result.type,
    status: result.success ? "success" : "failed",
    size_bytes: result.sizeBytes || 0,
    duration_ms: result.durationMs,
    storage_path: result.storagePath,
    error_message: result.error,
    metadata: result.metadata,
    created_at: new Date().toISOString(),
  });
}

serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);

  // Handle both POST with body and GET with query params
  let request: BackupRequest;

  if (req.method === "POST") {
    try {
      request = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
  } else {
    // GET request with query params
    request = {
      type: (url.searchParams.get("type") as BackupRequest["type"]) || "daily",
      tables: url.searchParams.get("tables")?.split(","),
    };
  }

  // Validate type
  const validTypes = ["daily", "weekly", "schema", "full"];
  if (!validTypes.includes(request.type)) {
    return new Response(JSON.stringify({ error: "Invalid backup type" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  const backupId = generateBackupId(request.type);

  try {
    console.log(`Starting ${request.type} backup: ${backupId}`);

    // Create backup dump
    const { dump, metadata } = await createBackupDump(request.type, request.tables);

    // Compress with gzip
    const compressed = await new Response(dump).body!.pipeThrough(new CompressionStream("gzip"));
    const compressedBytes = new Uint8Array(await new Response(compressed).arrayBuffer());

    // Upload to Supabase Storage
    const storagePath = await uploadToStorage(compressedBytes, backupId, request.type);

    // Also upload to Cloudflare R2 for off-site backup (if configured)
    const r2Path = await uploadToR2(compressedBytes, backupId, request.type);

    const durationMs = Date.now() - startTime;

    const result: BackupResult = {
      success: true,
      backupId,
      type: request.type,
      timestamp: new Date().toISOString(),
      sizeBytes: compressedBytes.length,
      durationMs,
      storagePath,
      r2Path,
      metadata,
    };

    // Log result
    await logBackupResult(result).catch(console.error);

    console.log(`Backup completed: ${backupId} (${compressedBytes.length} bytes, ${durationMs}ms)`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    const result: BackupResult = {
      success: false,
      backupId,
      type: request.type,
      timestamp: new Date().toISOString(),
      durationMs,
      error: errorMessage,
      metadata: {
        version: APP_VERSION,
        environment: ENVIRONMENT,
        tableCount: 0,
        rowCounts: {},
        schemaVersion: "unknown",
      },
    };

    await logBackupResult(result).catch(console.error);

    console.error(`Backup failed: ${backupId} - ${errorMessage}`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});