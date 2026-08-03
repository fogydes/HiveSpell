import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  checks: Record<string, ServiceHealth>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const APP_VERSION = Deno.env.get("APP_VERSION") || "dev";
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "production";

async function checkSupabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) throw error;
    return { status: "healthy", latencyMs: Date.now() - start, message: "Supabase query successful" };
  } catch (error) {
    return { status: "unhealthy", latencyMs: Date.now() - start, message: String(error) };
  }
}

async function checkAuth(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    return { status: "healthy", latencyMs: Date.now() - start, message: "Auth service reachable" };
  } catch (error) {
    return { status: "unhealthy", latencyMs: Date.now() - start, message: String(error) };
  }
}

async function checkStorage(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    return { status: "healthy", latencyMs: Date.now() - start, message: `Storage accessible (${data.length} buckets)` };
  } catch (error) {
    return { status: "unhealthy", latencyMs: Date.now() - start, message: String(error) };
  }
}

async function checkRealtime(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Realtime connectivity check via Supabase
    // This is a simple check - in reality you'd want to test WebSocket
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const channel = supabase.channel("health-check");
    const promise = new Promise<ServiceHealth>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.unsubscribe();
          resolve({ status: "healthy", latencyMs: Date.now() - start, message: "Realtime connected" });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          channel.unsubscribe();
          resolve({ status: "unhealthy", latencyMs: Date.now() - start, message: `Realtime status: ${status}` });
        }
      });
      setTimeout(() => {
        channel.unsubscribe();
        resolve({ status: "unhealthy", latencyMs: Date.now() - start, message: "Realtime connection timeout" });
      }, 3000);
    });
    return await promise;
  } catch (error) {
    return { status: "unhealthy", latencyMs: Date.now() - start, message: String(error) };
  }
}

async function runHealthChecks(): Promise<HealthCheckResult> {
  const checks = await Promise.all([
    checkSupabase().then((r) => ["supabase", r]),
    checkAuth().then((r) => ["auth", r]),
    checkStorage().then((r) => ["storage", r]),
    checkRealtime().then((r) => ["realtime", r]),
  ]);

  const checkMap = Object.fromEntries(checks);
  const total = checks.length;
  const healthy = checks.filter(([, r]) => r.status === "healthy").length;
  const degraded = checks.filter(([, r]) => r.status === "degraded").length;
  const unhealthy = checks.filter(([, r]) => r.status === "unhealthy").length;

  let overallStatus: HealthCheckResult["status"] = "healthy";
  if (unhealthy > 0) overallStatus = "unhealthy";
  else if (degraded > 0) overallStatus = "degraded";

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: ENVIRONMENT,
    checks: checkMap,
    summary: { total, healthy, degraded, unhealthy },
  };
}

serve(async (req) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  try {
    const result = await runHealthChecks();

    if (format === "prometheus") {
      // Format for Prometheus
      const lines: string[] = [
        `# HELP hivespell_health_status Overall health status (0=unhealthy, 1=degraded, 2=healthy)`,
        `# TYPE hivespell_health_status gauge`,
        `hivespell_health_status{environment="${result.environment}",version="${result.version}"} ${result.status === "healthy" ? 2 : result.status === "degraded" ? 1 : 0}`,
        `# HELP hivespell_health_checks_total Total number of health checks`,
        `# TYPE hivespell_health_checks_total gauge`,
        `hivespell_health_checks_total{environment="${result.environment}"} ${result.summary.total}`,
        `# HELP hivespell_health_checks_healthy Number of healthy checks`,
        `# TYPE hivespell_health_checks_healthy gauge`,
        `hivespell_health_checks_healthy{environment="${result.environment}"} ${result.summary.healthy}`,
        `# HELP hivespell_health_checks_degraded Number of degraded checks`,
        `# TYPE hivespell_health_checks_degraded gauge`,
        `hivespell_health_checks_degraded{environment="${result.environment}"} ${result.summary.degraded}`,
        `# HELP hivespell_health_checks_unhealthy Number of unhealthy checks`,
        `# TYPE hivespell_health_checks_unhealthy gauge`,
        `hivespell_health_checks_unhealthy{environment="${result.environment}"} ${result.summary.unhealthy}`,
      ];

      for (const [name, check] of Object.entries(result.checks)) {
        const statusValue = check.status === "healthy" ? 2 : check.status === "degraded" ? 1 : 0;
        lines.push(`hivespell_health_check_status{service="${name}",environment="${result.environment}"} ${statusValue}`);
        if (check.latencyMs !== undefined) {
          lines.push(`hivespell_health_check_latency_ms{service="${name}",environment="${result.environment}"} ${check.latencyMs}`);
        }
      }

      return new Response(lines.join("\n"), {
        headers: { "Content-Type": "text/plain; version=0.0.4" },
        status: result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503,
      });
    }

    // Default JSON response
    const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
      status: statusCode,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: APP_VERSION,
        environment: ENVIRONMENT,
        error: String(error),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});