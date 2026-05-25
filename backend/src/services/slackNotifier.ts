import { env } from "../config/env.js";

interface NewUserPayload {
  email: string;
  role: string;
  createdAt: Date;
}

type SecurityAlertPayload =
  | {
      kind: "failed_logins";
      email: string;
      ip: string;
      count: number;
      windowStartedAt: Date;
      windowMinutes: number;
    }
  | {
      kind: "rate_limit";
      endpoint: string;
      ip: string;
      email?: string;
    };

type InventoryEventPayload =
  | {
      kind: "status_op";
      productId: string;
      sku?: string;
      fromStatus: number | null;
      toStatus: number;
      actor: "admin" | "user";
      actorUserId?: string;
    }
  | {
      kind: "bulk_action";
      action: "delete" | "status_change";
      total: number;
      successCount: number;
      failureCount: number;
      toStatus?: number;
      actor: "admin" | "user";
      actorUserId?: string;
    }
  | {
      kind: "audit_override";
      productId: string;
      sku?: string;
      fromStatus: number;
      toStatus: number;
      actor: "admin" | "user";
      actorUserId?: string;
      reason?: string;
    };

interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

interface SlackAttachment {
  color?: string;
  blocks?: SlackBlock[];
}

const SLACK_ACCENT_COLORS = [
  "#7B68EE",
  "#36a64f",
  "#2eb886",
  "#E8912D",
  "#1264A3",
  "#9B59B6",
  "#E01E5A",
  "#F2C744",
] as const;

function pickRandomAccentColor(): string {
  return SLACK_ACCENT_COLORS[
    Math.floor(Math.random() * SLACK_ACCENT_COLORS.length)
  ]!;
}

function formatSlackDateTime(date: Date): string {
  const unix = Math.floor(date.getTime() / 1000);
  const fallback = date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `<!date^${unix}^{date_short_pretty} at {time}|${fallback}>`;
}

function formatRoleLabel(role: string): string {
  if (role === "admin") return ":key: *Admin*";
  if (role === "user") return ":bust_in_silhouette: *User*";
  return `*${role}*`;
}

async function postToWebhook(
  url: string | undefined,
  blocks: SlackBlock[],
  fallback: string,
  attachments?: SlackAttachment[]
): Promise<void> {
  if (!env.SLACK_ALERTS_ENABLED) return;
  if (!url) return;

  const body: Record<string, unknown> = { text: fallback };
  if (attachments?.length) {
    body.attachments = attachments;
    if (blocks.length) body.blocks = blocks;
  } else {
    body.blocks = blocks;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[slack] webhook returned ${response.status}: ${body.slice(0, 200)}`
      );
    }
  } catch (err) {
    console.error("[slack] notify failed", err);
  }
}

function fieldBlock(label: string, value: string): SlackBlock {
  return {
    type: "mrkdwn",
    text: `*${label}:*\n${value}`,
  };
}

export async function notifyNewUser(payload: NewUserPayload): Promise<void> {
  const fallback = `:wave: New user joined: ${payload.email} (${payload.role})`;
  const attachments: SlackAttachment[] = [
    {
      color: pickRandomAccentColor(),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*:wave: New user joined*\n\`${payload.email}\`\n${formatRoleLabel(payload.role)}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `:clock3: ${formatSlackDateTime(payload.createdAt)}`,
            },
          ],
        },
      ],
    },
  ];

  await postToWebhook(
    env.SLACK_WEBHOOK_URL_NEW_USERS,
    [],
    fallback,
    attachments
  );
}

export async function notifySecurityAlert(
  payload: SecurityAlertPayload
): Promise<void> {
  let fallback: string;
  const blocks: SlackBlock[] = [];

  if (payload.kind === "failed_logins") {
    fallback = `:rotating_light: ${payload.count} failed login attempts in ${payload.windowMinutes} min for ${payload.email}`;
    blocks.push(
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:rotating_light: ${payload.count} failed login attempts in ${payload.windowMinutes} min`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          fieldBlock("Email", payload.email),
          fieldBlock("IP", payload.ip),
          fieldBlock("Window started", payload.windowStartedAt.toISOString()),
          fieldBlock("Count", String(payload.count)),
        ],
      }
    );
  } else {
    fallback = `:no_entry: Rate limit hit on ${payload.endpoint}`;
    const fields = [fieldBlock("Endpoint", payload.endpoint), fieldBlock("IP", payload.ip)];
    if (payload.email) {
      fields.push(fieldBlock("Email (from body)", payload.email));
    }
    blocks.push(
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":no_entry: Rate limit hit",
          emoji: true,
        },
      },
      {
        type: "section",
        fields,
      }
    );
  }

  await postToWebhook(env.SLACK_WEBHOOK_URL_ALERTS_SECURITY, blocks, fallback);
}

export async function notifyInventoryEvent(
  payload: InventoryEventPayload
): Promise<void> {
  if (payload.kind === "status_op") {
    const fallback = `:package: Status change ${payload.fromStatus ?? "-"} -> ${payload.toStatus} (product ${payload.sku ?? payload.productId})`;
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":package: Product status change",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          fieldBlock("Product", payload.sku ?? payload.productId),
          fieldBlock("Product Id", payload.productId),
          fieldBlock(
            "From -> To",
            `${payload.fromStatus ?? "-"} -> ${payload.toStatus}`
          ),
          fieldBlock("Actor", payload.actor),
          fieldBlock("Actor User Id", payload.actorUserId ?? "-"),
        ],
      },
    ];
    await postToWebhook(
      env.SLACK_WEBHOOK_URL_INVENTORY_STATUS_OPS,
      blocks,
      fallback
    );
    return;
  }

  if (payload.kind === "bulk_action") {
    const fallback = `:books: Bulk ${payload.action}: ${payload.successCount}/${payload.total} ok, ${payload.failureCount} failed`;
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:books: Bulk ${payload.action.replace("_", " ")}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          fieldBlock("Total", String(payload.total)),
          fieldBlock("Success", String(payload.successCount)),
          fieldBlock("Failed", String(payload.failureCount)),
          fieldBlock("Target status", payload.toStatus?.toString() ?? "-"),
          fieldBlock("Actor", payload.actor),
          fieldBlock("Actor User Id", payload.actorUserId ?? "-"),
        ],
      },
    ];
    await postToWebhook(
      env.SLACK_WEBHOOK_URL_INVENTORY_BULK_ACTIONS,
      blocks,
      fallback
    );
    return;
  }

  const fallback = `:warning: Admin override demotion ${payload.fromStatus} -> ${payload.toStatus} on ${payload.sku ?? payload.productId}`;
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: ":warning: Admin override (status demotion from Delivered)",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        fieldBlock("Product", payload.sku ?? payload.productId),
        fieldBlock("Product Id", payload.productId),
        fieldBlock(
          "From -> To",
          `${payload.fromStatus} -> ${payload.toStatus}`
        ),
        fieldBlock("Actor", payload.actor),
        fieldBlock("Actor User Id", payload.actorUserId ?? "-"),
        fieldBlock("Reason", payload.reason ?? "-"),
      ],
    },
  ];
  await postToWebhook(
    env.SLACK_WEBHOOK_URL_INVENTORY_AUDIT_OVERRIDE,
    blocks,
    fallback
  );
}
