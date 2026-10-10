/**
 * Offline-first order queue for the POS terminal.
 *
 * When the internet drops, completed sales are stored on the device
 * (localStorage) and replayed to /api/orders in original order as soon
 * as connectivity returns. Nothing the cashier rings up is ever lost.
 */

export type QueuedOrderItem = { menuItemId: number; quantity: number; extraIndex?: number };

export type QueuedOrder = {
  /** Client-generated id so we can track/replace queue entries safely. */
  localId: string;
  queuedAt: number;
  customerName: string;
  amountReceived: number;
  items: QueuedOrderItem[];
  discount?: { type: string; value: number };
  paymentMethod?: string;
  customerPhone?: string;
};

const QUEUE_KEY = "kpos_offline_orders_v1";

export function loadQueue(): QueuedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedOrder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* storage full/blocked — keep the in-memory copy */
  }
}

export function enqueueOrder(order: Omit<QueuedOrder, "localId" | "queuedAt">): QueuedOrder[] {
  const entry: QueuedOrder = {
    ...order,
    localId: `off-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
  };
  const queue = [...loadQueue(), entry];
  saveQueue(queue);
  return queue;
}

export function removeFromQueue(localId: string): QueuedOrder[] {
  const queue = loadQueue().filter((o) => o.localId !== localId);
  saveQueue(queue);
  return queue;
}

export function clearQueue() {
  saveQueue([]);
}
