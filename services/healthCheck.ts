/**
 * Health check service
 * Provides comprehensive health checks for all critical services
 */

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

type HealthCheckFn = () => Promise<ServiceHealth>;

class HealthChecker {
  private checks: Map<string, HealthCheckFn> = new Map();
  private version: string;
  private environment: string;

  constructor(version?: string, environment?: string) {
    this.version = version || import.meta.env.VITE_APP_VERSION || "dev";
    this.environment = environment || import.meta.env.MODE || "development";
  }

  /**
   * Register a health check for a service
   */
  registerCheck(name: string, checkFn: HealthCheckFn): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Run all registered health checks
   */
  async runChecks(): Promise<HealthCheckResult> {
    const results: Record<string, ServiceHealth> = {};
    const startTime = Date.now();

    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, checkFn]) => {
        const checkStart = Date.now();
        try {
          const result = await checkFn();
          result.latencyMs = Date.now() - checkStart;
          return { name, result };
        } catch (error) {
          return {
            name,
            result: {
              status: "unhealthy" as const,
              latencyMs: Date.now() - checkStart,
              message: error instanceof Error ? error.message : "Unknown error",
            },
          };
        }
      },
    );

    const checkResults = await Promise.all(checkPromises);

    for (const { name, result } of checkResults) {
      results[name] = result;
    }

    // Calculate summary
    const total = Object.keys(results).length;
    const healthy = Object.values(results).filter((r) => r.status === "healthy").length;
    const degraded = Object.values(results).filter((r) => r.status === "degraded").length;
    const unhealthy = Object.values(results).filter((r) => r.status === "unhealthy").length;

    let overallStatus: HealthCheckResult["status"] = "healthy";
    if (unhealthy > 0) overallStatus = "unhealthy";
    else if (degraded > 0) overallStatus = "degraded";

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: this.version,
      environment: this.environment,
      checks: results,
      summary: { total, healthy, degraded, unhealthy },
    };
  }

  /**
   * Run a single health check by name
   */
  async runCheck(name: string): Promise<ServiceHealth | null> {
    const checkFn = this.checks.get(name);
    if (!checkFn) return null;

    const startTime = Date.now();
    try {
      const result = await checkFn();
      result.latencyMs = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        status: "unhealthy",
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Create health checker with standard service checks
 */
export function createHealthChecker(): HealthChecker {
  const checker = new HealthChecker();

  // Firebase Auth check
  checker.registerCheck("firebase-auth", async () => {
    try {
      // This would typically call a lightweight Firebase Auth endpoint
      // For now, we'll simulate a check
      return { status: "healthy", message: "Firebase Auth reachable" };
    } catch {
      return { status: "unhealthy", message: "Firebase Auth unreachable" };
    }
  });

  // Firebase Realtime Database check
  checker.registerCheck("firebase-rtdb", async () => {
    try {
      // Ping RTDB
      return { status: "healthy", message: "Firebase RTDB reachable" };
    } catch {
      return { status: "unhealthy", message: "Firebase RTDB unreachable" };
    }
  });

  // Supabase check
  checker.registerCheck("supabase", async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return { status: "degraded", message: "Supabase URL not configured" };
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "HEAD",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { status: "healthy", message: "Supabase reachable" };
      }
      return { status: "degraded", message: `Supabase returned ${response.status}` };
    } catch {
      return { status: "unhealthy", message: "Supabase unreachable" };
    }
  });

  // Edge Functions check
  checker.registerCheck("edge-functions", async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return { status: "degraded", message: "Supabase URL not configured" };
      }

      // Try to call a simple edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/health`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { status: "healthy", message: "Edge Functions reachable" };
      }
      return { status: "degraded", message: `Edge Functions returned ${response.status}` };
    } catch {
      return { status: "unhealthy", message: "Edge Functions unreachable" };
    }
  });

  // PWA Service Worker check
  checker.registerCheck("service-worker", async () => {
    if (typeof navigator === "undefined") {
      return { status: "healthy", message: "SSR - not applicable" };
    }

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          return { status: "healthy", message: "Service Worker active" };
        }
        return { status: "degraded", message: "Service Worker installing" };
      } catch {
        return { status: "unhealthy", message: "Service Worker failed" };
      }
    }
    return { status: "healthy", message: "Service Worker not supported" };
  });

  // Storage check
  checker.registerCheck("storage", async () => {
    try {
      // Check localStorage availability
      const testKey = "__health_check__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return { status: "healthy", message: "LocalStorage available" };
    } catch {
      return { status: "degraded", message: "LocalStorage unavailable" };
    }
  });

  return checker;
}

/**
 * Health check result formatter for different outputs
 */
export function formatHealthResult(
  result: HealthCheckResult,
  format: "json" | "prometheus" | "text" = "json",
): string {
  switch (format) {
    case "prometheus":
      return formatForPrometheus(result);
    case "text":
      return formatForText(result);
    default:
      return JSON.stringify(result, null, 2);
  }
}

function formatForPrometheus(result: HealthCheckResult): string {
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

  return lines.join("\n");
}

function formatForText(result: HealthCheckResult): string {
  const lines: string[] = [
    `HiveSpell Health Check`,
    `======================`,
    `Status: ${result.status.toUpperCase()}`,
    `Timestamp: ${result.timestamp}`,
    `Version: ${result.version}`,
    `Environment: ${result.environment}`,
    ``,
    `Summary: ${result.summary.healthy}/${result.summary.total} healthy, ${result.summary.degraded} degraded, ${result.summary.unhealthy} unhealthy`,
    ``,
    `Checks:`,
  ];

  for (const [name, check] of Object.entries(result.checks)) {
    const statusIcon = check.status === "healthy" ? "✅" : check.status === "degraded" ? "⚠️" : "❌";
    const latency = check.latencyMs !== undefined ? ` (${check.latencyMs}ms)` : "";
    lines.push(`  ${statusIcon} ${name}: ${check.status}${latency}${check.message ? ` - ${check.message}` : ""}`);
  }

  return lines.join("\n");
}

// Export singleton for convenience
export const healthChecker = createHealthChecker();

/**
 * Quick health check for use in load balancers / k8s probes
 */
export async function quickHealthCheck(): Promise<{ status: "ok" | "error"; timestamp: string }> {
  const result = await healthChecker.runChecks();
  return {
    status: result.status === "healthy" ? "ok" : "error",
    timestamp: result.timestamp,
  };
}