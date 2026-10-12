/**
 * Static on-device demo store.
 *
 * The public /demo page must feel exactly like the real product while costing
 * zero database traffic — no matter how many visitors try it. Everything the
 * demo "sells" is written to localStorage only; the server never sees it.
 */

export type DemoOrder = {
  orderNumber: number;
  at: string; // ISO
  customer: string;
  items: { name: string; qty: number; lineTotal: number }[];
  total: number;
};

const ORDERS_KEY = "kpos_demo_orders_v1";
const NO_KEY = "kpos_demo_no_v1";

export function loadDemoOrders(): DemoOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw) as DemoOrder[];
  } catch {
    /* ignore */
  }
  // First visit: seed a believable "busy day" so Sales isn't empty.
  const seed = seedOrders();
  saveDemoOrders(seed);
  return seed;
}

export function saveDemoOrders(orders: DemoOrder[]) {
  try {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 60)));
  } catch {
    /* full / private mode */
  }
}

export function nextDemoOrderNo(): number {
  let n = 1042;
  try {
    n = Number(window.localStorage.getItem(NO_KEY) ?? "1042") || 1042;
    window.localStorage.setItem(NO_KEY, String(n + 1));
  } catch {
    n = 1042 + loadDemoOrders().length;
  }
  return n;
}

export function recordDemoOrder(order: DemoOrder) {
  saveDemoOrders([order, ...loadDemoOrders()]);
}

export function resetDemoData() {
  try {
    window.localStorage.removeItem(ORDERS_KEY);
    window.localStorage.removeItem(NO_KEY);
  } catch {
    /* ignore */
  }
}

function seedOrders(): DemoOrder[] {
  const names = ["Sara", "Ali", "Emma", "John", "Fatima", "Omar", "Elena", "Daniel", "Ayesha", "Marco"];
  const dishes = [
    { name: "Zinger Burger", price: 450 },
    { name: "Margherita Pizza", price: 899 },
    { name: "Loaded Fries", price: 299 },
    { name: "Cold Coffee", price: 250 },
  ];
  const orders: DemoOrder[] = [];
  let no = 1028;
  for (let i = 0; i < 14; i++) {
    const itemA = dishes[i % dishes.length];
    const itemB = dishes[(i + 2) % dishes.length];
    const qtyA = 1 + (i % 2);
    const total = itemA.price * qtyA + (i % 3 === 0 ? itemB.price : 0);
    orders.push({
      orderNumber: no++,
      at: new Date(Date.now() - i * 47 * 60_000).toISOString(),
      customer: names[i % names.length],
      items:
        i % 3 === 0
          ? [
              { name: itemA.name, qty: qtyA, lineTotal: itemA.price * qtyA },
              { name: itemB.name, qty: 1, lineTotal: itemB.price },
            ]
          : [{ name: itemA.name, qty: qtyA, lineTotal: itemA.price * qtyA }],
      total,
    });
  }
  return orders.reverse();
}
