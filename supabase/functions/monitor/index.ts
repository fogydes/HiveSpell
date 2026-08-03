import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AlertConfig {
  threshold: "degraded" | "unhealthy";
  channels: ("slack" | "email" | "pagerduty" | "webhook")[];
  cooldownMinutes: number;
}

interface AlertPayload {
  alert: {
    title: string;
    message: string;
    severity: "warning" | "critical";
    service: string;
    environment: string;
    timestamp: string;
    details?: Record<string, unknown>;
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") || "";
const PAGERDUTY_INTEGRATION_KEY = Deno.env.get("PAGERDUTY_INTEGRATION_KEY") || "";
const ALERT_WEBHOOK_URL = Deno.env.get("ALERT_WEBHOOK_URL") || "";
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "production";
const ALERT_COOLDOWN_MINUTES = parseInt(Deno.env.get("ALERT_COOLDOWN_MINUTES") || "15");

// In-memory cache for alert cooldown (in production, use Redis or database)
const alertCooldown = new Map<string, number>();

async function checkSupabase(): Promise<{ status: string; latencyMs: number; message: string }> {
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

async function checkAuth(): Promise<{ status: string; latencyMs: number; message: string }> {
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

async function checkStorage(): Promise<{ status: string; latencyMs: number; message: string }> {
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

async function checkRealtime(): Promise<{ status: string; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const channel = supabase.channel("monitor-health-check");
    const promise = new Promise<{ status: string; latencyMs: number; message: string }>((resolve) => {
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

async function sendSlackAlert(payload: AlertPayload): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;

  const color = payload.alert.severity === "critical" ? "#ff0000" : "#ffaa00";
  const emoji = payload.alert.severity === "critical" ? "🚨" : "⚠️";

  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: `${emoji} ${payload.alert.title}`,
          text: payload.alert.message,
          fields: [
            { title: "Service", value: payload.alert.service, short: true },
            { title: "Environment", value: payload.alert.environment, short: true },
            { title: "Severity", value: payload.alert.severity, short: true },
            { title: "Time", value: payload.alert.timestamp, short: true },
          ],
          footer: "HiveSpell Monitoring",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }),
  });
}

async function sendPagerDutyAlert(payload: AlertPayload): Promise<void> {
  if (!PAGERDUTY_INTEGRATION_KEY) return;

  await fetch("https://events.pagerduty.com/v2/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routing_key: PAGERDUTY_INTEGRATION_KEY,
      event_action: "trigger",
      payload: {
        summary: payload.alert.title,
        severity: payload.alert.severity === "critical" ? "critical" : "warning",
        source: "hivespell-monitor",
        component: payload.alert.service,
        group: payload.alert.environment,
        custom_details: payload.alert.details,
      },
    }),
  });
}

async function sendWebhookAlert(payload: AlertPayload): Promise<void> {
  if (!ALERT_WEBHOOK_URL) return;

  await fetch(ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendAlert(payload: AlertPayload, channels: string[]): Promise<void> {
  const promises: Promise<void>[] = [];

  if (channels.includes("slack")) promises.push(sendSlackAlert(payload));
  if (channels.includes("pagerduty")) promises.push(sendPagerDutyAlert(payload));
  if (channels.includes("webhook")) promises.push(sendWebhookAlert(payload));
  // Email would require a service like SendGrid/Resend - omitted for brevity

  await Promise.allSettled(promises);
}

function shouldAlert(service: string, severity: string): boolean {
  const key = `${service}:${severity}`;
  const lastAlert = alertCooldown.get(key) || 0;
  const now = Date.now();
  const cooldownMs = ALERT_COOLDOWN_MINUTES * 60 * 1000;

  if (now - lastAlert < cooldownMs) {
    return false;
  }

  alertCooldown.set(key, now);
  return true;
}

async function runMonitoring(): Promise<{ checks: Record<string, { status: string; latencyMs: number; message: string }>; alertsSent: number }> {
  const checks = await Promise.all([
    checkSupabase().then((r) => ["supabase", r]),
    checkAuth().then((r) => ["auth", r]),
    checkStorage().then((r) => ["storage", r]),
    checkRealtime().then((r) => ["realtime", r]),
  ]);

  const checkMap = Object.fromEntries(checks);
  let alertsSent = 0;

  for (const [service, check] of Object.entries(checkMap)) {
    if (check.status === "unhealthy" && shouldAlert(service, "critical")) {
      await sendAlert(
        {
          alert: {
            title: `HiveSpell: ${service.toUpperCase()} is UNHEALTHY`,
            message: `${service} health check failed: ${check.message}`,
            severity: "critical",
            service,
            environment: ENVIRONMENT,
            timestamp: new Date().toISOString(),
            details: { latencyMs: check.latencyMs, ...check },
          },
        },
        ["slack", "pagerduty", "webhook"],
      );
      alertsSent++;
    } else if (check.status === "degraded" && shouldAlert(service, "warning")) {
      await sendAlert(
        {
          alert: {
            title: `HiveSpell: ${service.toUpperCase()} is DEGRADED`,
            message: `${service} health check degraded: ${check.message}`,
            severity: "warning",
            service,
            environment: ENVIRONMENT,
            timestamp: new Date().toISOString(),
            details: { latencyMs: check.latencyMs, ...check },
          },
        },
        ["slack", "webhook"],
      );
      alertsSent++;
    }
  }

  // Log monitoring run
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: ENVIRONMENT,
      checks: checkMap,
      alertsSent,
    }),
  );

  return { checks: checkMap, alertsSent };
}

serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "check";

  if (action === "check") {
    const result = await runMonitoring();
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  if (action === "test-alert") {
    await sendAlert(
      {
        alert: {
          title: "HiveSpell: Test Alert",
          message: "This is a test alert from the monitoring system",
          severity: "warning",
          service: "test",
          environment: ENVIRONMENT,
          timestamp: new Date().toISOString(),
        },
      },
      ["slack", "webhook"],
    );
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    headers: { "Content-Type": "application/json" },
    status: 400,
  });
});