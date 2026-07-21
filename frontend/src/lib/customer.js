// Chat list endpoints return `customer` as the raw customerId *string*, not an
// object — visitors are anonymous, so there is no name or email to display.
// The panels used to read `chat.customer?.name`, which was always undefined and
// rendered as "Unknown" for every conversation.
//
// Widget-generated ids are UUIDs (crypto.randomUUID in ChatWidget), which are
// unreadable in a sidebar, so they are shortened to a stable visitor label.
// Ids supplied by the host site via SupportCueConfig.customerId are meaningful
// to the agent and are shown as-is.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The customer id for a chat, whichever shape the caller normalised it into. */
export function customerId(chat) {
  const raw = chat?.customer ?? chat?.customerId;
  if (typeof raw === "string") return raw;
  return raw?.id || raw?._id || null;
}

/** Short human-readable label for a chat's customer. */
export function customerLabel(chat) {
  const id = customerId(chat);
  if (!id) return "Unknown visitor";
  return UUID_RE.test(id) ? `Visitor ${id.slice(0, 8)}` : id;
}
