export type BankId = "aurora" | "verde" | "solar";
export type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  bank: BankId;
  source: "import" | "manual";
};
export type Profile = { name: string; email: string };
export type Store = {
  version: 1;
  profile: Profile;
  banks: BankId[];
  transactions: Transaction[];
  synced: string;
  complete: boolean;
};
export const STORAGE_KEY = "controle-financeiro-demo-v1";
export const banks: {
  id: BankId;
  name: string;
  initial: string;
  color: string;
  opening: number;
  type: string;
}[] = [
  {
    id: "aurora",
    name: "Aurora",
    initial: "a",
    color: "#7652a0",
    opening: 345000,
    type: "Conta digital",
  },
  {
    id: "verde",
    name: "Verde",
    initial: "v",
    color: "#287760",
    opening: 218000,
    type: "Conta corrente",
  },
  {
    id: "solar",
    name: "Solar",
    initial: "s",
    color: "#b05b2d",
    opening: 126000,
    type: "Conta digital",
  },
];
export const categories = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Compras",
  "Lazer",
  "Saúde",
  "Serviços",
  "Salário",
  "Outros",
];
export const categoryColors: Record<string, string> = {
  Alimentação: "#bc9351",
  Moradia: "#124b3d",
  Transporte: "#7c9b8e",
  Compras: "#a28caa",
  Lazer: "#c8775b",
  Saúde: "#5c8294",
  Serviços: "#777249",
  Outros: "#7a7771",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export function isoToday() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function monthKey(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function monthLabel(value: string) {
  return new Date(value + "-02T12:00:00").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
export function generateTransactions(id: BankId): Transaction[] {
  const templates: Record<BankId, [string, number, string, number][]> = {
    aurora: [
      ["Salário", 650000, "Salário", 2],
      ["Aluguel", -185000, "Moradia", 5],
      ["Mercado da Vila", -32790, "Alimentação", 8],
      ["Café & Companhia", -2450, "Alimentação", 10],
      ["Livraria Horizonte", -8990, "Compras", 12],
      ["Cinema", -6400, "Lazer", 14],
      ["Restaurante Jardim", -12400, "Alimentação", 15],
    ],
    verde: [
      ["Projeto freelance", 180000, "Outros", 3],
      ["Internet residencial", -11990, "Serviços", 6],
      ["Mobilidade urbana", -4260, "Transporte", 9],
      ["Farmácia Bem", -7850, "Saúde", 11],
      ["Feira de sábado", -13500, "Alimentação", 13],
      ["Academia", -14990, "Saúde", 15],
    ],
    solar: [
      ["Rendimento extra", 85000, "Outros", 4],
      ["Energia elétrica", -17840, "Moradia", 7],
      ["Assinatura de música", -2190, "Lazer", 9],
      ["Loja Casa", -18990, "Compras", 12],
      ["Combustível", -18000, "Transporte", 14],
    ],
  };
  return Array.from({ length: 6 }, (_, i) => {
    const offset = -i,
      month = monthKey(offset);
    const maxDay = offset === 0 ? new Date().getDate() : 31;
    return templates[id]
      .filter((t) => t[3] <= maxDay)
      .map((t, index) => ({
        id: `${id}-${month}-${index}`,
        description: t[0],
        amount: t[1] + (t[1] < 0 ? i * 230 : 0),
        date: `${month}-${String(t[3]).padStart(2, "0")}`,
        category: t[2],
        bank: id,
        source: "import" as const,
      }));
  }).flat();
}
export function importBanks(store: Store, selected: BankId[]): Store {
  const added = selected.filter((id) => !store.banks.includes(id));
  return {
    ...store,
    banks: [...store.banks, ...added],
    transactions: [
      ...store.transactions,
      ...added.flatMap(generateTransactions),
    ],
    synced: new Date().toISOString(),
  };
}
export function totals(list: Transaction[]) {
  return list.reduce(
    (a, t) => ({
      income: a.income + Math.max(t.amount, 0),
      expense: a.expense + Math.max(-t.amount, 0),
      net: a.net + t.amount,
    }),
    { income: 0, expense: 0, net: 0 },
  );
}
export function accountBalance(store: Store, id: BankId) {
  return (
    (banks.find((b) => b.id === id)?.opening ?? 0) +
    totals(store.transactions.filter((t) => t.bank === id)).net
  );
}
export function filterTransactions(
  list: Transaction[],
  filters: {
    month: string;
    bank: string;
    category: string;
    query: string;
    type?: string;
  },
) {
  return list
    .filter(
      (t) =>
        (filters.month === "all" || t.date.startsWith(filters.month)) &&
        (filters.bank === "all" || t.bank === filters.bank) &&
        (filters.category === "all" || t.category === filters.category) &&
        (!filters.type ||
          filters.type === "all" ||
          (filters.type === "income" ? t.amount > 0 : t.amount < 0)) &&
        t.description
          .toLocaleLowerCase("pt-BR")
          .includes(filters.query.toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function parseAmount(value: string) {
  if (!/^\d{1,9}([.,]\d{1,2})?$/.test(value.trim())) return null;
  const amount = Math.round(Number(value.replace(",", ".")) * 100);
  return amount > 0 && Number.isSafeInteger(amount) ? amount : null;
}
export function isStore(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const v = value as Store;
  return (
    v.version === 1 &&
    !!v.profile &&
    typeof v.profile.name === "string" &&
    typeof v.profile.email === "string" &&
    typeof v.complete === "boolean" &&
    typeof v.synced === "string" &&
    Array.isArray(v.banks) &&
    v.banks.every((id) => banks.some((b) => b.id === id)) &&
    new Set(v.banks).size === v.banks.length &&
    Array.isArray(v.transactions) &&
    v.transactions.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.description === "string" &&
        Number.isSafeInteger(t.amount) &&
        typeof t.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
        typeof t.category === "string" &&
        v.banks.includes(t.bank) &&
        (t.source === "import" || t.source === "manual"),
    )
  );
}
