"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Settings2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Search,
  SlidersHorizontal,
  X,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  Wallet,
  ShieldCheck,
  CircleHelp,
  Check,
  ChevronRight,
  LogOut,
  Utensils,
  House,
  Car,
  ShoppingBag,
  Heart,
  CircleDollarSign,
  Film,
  Wrench,
  MoreHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Brand } from "@/components/brand";
import {
  banks,
  categories,
  categoryColors,
  money,
  monthKey,
  monthLabel,
  isoToday,
  totals,
  accountBalance,
  filterTransactions,
  parseAmount,
  type Store,
  type Transaction,
  type BankId,
} from "@/lib/finance";
const categoryIcons: Record<string, typeof House> = {
  Moradia: House,
  Alimentação: Utensils,
  Transporte: Car,
  Compras: ShoppingBag,
  Saúde: Heart,
  Salário: CircleDollarSign,
  Lazer: Film,
  Serviços: Wrench,
  Outros: MoreHorizontal,
};
const sections = [
  { id: "overview", label: "Visão geral", Icon: LayoutDashboard },
  { id: "transactions", label: "Transações", Icon: ArrowLeftRight },
  { id: "accounts", label: "Minhas contas", Icon: Landmark },
  { id: "settings", label: "Meu perfil", Icon: Settings2 },
];
type Props = {
  store: Store;
  onChange: (store: Store) => void;
  onConnect: () => void;
  onReset: () => void;
};
export default function Dashboard({
  store,
  onChange,
  onConnect,
  onReset,
}: Props) {
  const [section, setSection] = useState("overview"),
    [month, setMonth] = useState(monthKey()),
    [bank, setBank] = useState("all"),
    [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [hidden, setHidden] = useState(false),
    [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null),
    [pending, setPending] = useState<{
      kind: "reset" | "bank" | "transaction";
      id?: string;
    } | null>(null),
    [error, setError] = useState("");
  const editor = useRef<HTMLDialogElement>(null),
    confirm = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    heading.current?.focus();
  }, [section]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(t);
  }, [message]);
  const filtered = useMemo(
    () =>
      filterTransactions(store.transactions, {
        month,
        bank,
        category,
        query,
        type,
      }),
    [store.transactions, month, bank, category, query, type],
  );
  const summary = totals(filtered);
  const balance = store.banks
    .filter((id) => bank === "all" || bank === id)
    .reduce((s, id) => s + accountBalance(store, id), 0);
  const spent = categories
    .filter((c) => c !== "Salário")
    .map((name) => ({
      name,
      value: filtered
        .filter((t) => t.category === name && t.amount < 0)
        .reduce((s, t) => s - t.amount, 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const months = Array.from(
    new Set([
      monthKey(),
      ...Array.from({ length: 6 }, (_, i) => monthKey(-i)),
      ...store.transactions.map((t) => t.date.slice(0, 7)),
    ]),
  )
    .sort()
    .reverse();
  const trend = useMemo(() => {
    const d = new Date(month + "-01T12:00:00");
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const limit = month === monthKey() ? new Date().getDate() : days;
    let total = 0;
    return Array.from({ length: limit }, (_, i) => {
      const date = month + "-" + String(i + 1).padStart(2, "0");
      total += filtered
        .filter((t) => t.date === date)
        .reduce((s, t) => s + t.amount, 0);
      return { day: String(i + 1).padStart(2, "0"), value: total / 100 };
    });
  }, [filtered, month]);
  const fmt = (value: number) => (hidden ? "••••••" : money(value));
  const noBanks = !store.banks.length;
  function navigate(id: string) {
    setSection(id);
    setQuery("");
  }
  function notify(text: string) {
    setMessage(text);
  }
  function openEditor(t: Transaction | null = null) {
    setEditing(t);
    setError("");
    editor.current?.showModal();
  }
  function requestConfirm(value: typeof pending) {
    setPending(value);
    confirm.current?.showModal();
  }
  function confirmAction() {
    if (!pending) return;
    if (pending.kind === "reset") {
      confirm.current?.close();
      onReset();
      return;
    }
    if (pending.kind === "bank") {
      onChange({
        ...store,
        banks: store.banks.filter((id) => id !== pending.id),
        transactions: store.transactions.filter((t) => t.bank !== pending.id),
      });
      if (bank === pending.id) setBank("all");
      notify("Conta removida com suas movimentações de demonstração.");
    } else {
      onChange({
        ...store,
        transactions: store.transactions.filter((t) => t.id !== pending.id),
      });
      notify("Lançamento excluído.");
    }
    confirm.current?.close();
    setPending(null);
  }
  function submitTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = parseAmount(String(form.get("amount")));
    if (!amount) {
      setError(
        "Informe um valor maior que zero, com até duas casas decimais. Exemplo: 125,90.",
      );
      return;
    }
    const description = String(form.get("description")).trim();
    if (!description) {
      setError("Informe uma descrição para o lançamento.");
      return;
    }
    const t: Transaction = {
      id: editing?.id ?? crypto.randomUUID(),
      description,
      amount: amount * (form.get("type") === "expense" ? -1 : 1),
      date: String(form.get("date")),
      category: String(form.get("category")),
      bank: String(form.get("bank")) as BankId,
      source: editing?.source ?? "manual",
    };
    onChange({
      ...store,
      transactions: editing
        ? store.transactions.map((item) => (item.id === editing.id ? t : item))
        : [...store.transactions, t],
    });
    setMonth(t.date.slice(0, 7));
    setBank("all");
    setCategory("all");
    setType("all");
    setQuery("");
    editor.current?.close();
    notify(editing ? "Lançamento atualizado." : "Lançamento adicionado.");
  }
  function exportCsv() {
    const rows = [
      ["Data", "Descrição", "Categoria", "Banco", "Valor (BRL)"],
      ...filtered.map((t) => [
        t.date,
        t.description,
        t.category,
        banks.find((b) => b.id === t.bank)?.name ?? "",
        (t.amount / 100).toFixed(2).replace(".", ","),
      ]),
    ];
    const content =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(
              (c) =>
                '"' +
                String(c)
                  .replace(/^[=+@\-]/, "'")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `financas-demo-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Arquivo CSV exportado com os filtros atuais.");
  }
  const filteredActive =
    bank !== "all" || category !== "all" || query || type !== "all";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Pular para conteúdo
      </a>
      <aside className="sidebar">
        <Brand compact />
        <nav aria-label="Navegação principal">
          {sections.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {section === id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-sidebar">
            <ShieldCheck size={21} />
            <strong>Um espaço para explorar.</strong>
            <p>Dados fictícios. Possibilidades reais de organização.</p>
            <span>Modo demonstração</span>
          </div>
          <button className="profile-nav" onClick={() => navigate("settings")}>
            <span className="avatar">
              {store.profile.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{store.profile.name}</strong>
              <small>Perfil de demonstração</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-topbar">
          <span className="breadcrumb">
            Meu espaço <ChevronRight size={13} />
            <strong>{sections.find((s) => s.id === section)?.label}</strong>
          </span>
          <div className="topbar-right">
            <span className="demo-label">
              <span /> Dados fictícios
            </span>
            <button
              className="icon-button"
              aria-label="Sobre a demonstração"
              onClick={() => {
                navigate("settings");
              }}
            >
              <CircleHelp size={19} />
            </button>
            <span className="avatar small">
              {store.profile.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main-content" className="dashboard-main">
          <div className="page-heading">
            <div>
              <h1 ref={heading} tabIndex={-1}>
                {section === "overview" ? (
                  <>
                    Mais clareza, {store.profile.name.split(" ")[0]}
                    <span className="gold">.</span>
                  </>
                ) : (
                  sections.find((s) => s.id === section)?.label
                )}
              </h1>
              <p>
                {section === "overview"
                  ? "Seu dinheiro organizado. Seus próximos passos, mais leves."
                  : section === "transactions"
                    ? "Cada movimentação conta uma parte da sua história."
                    : section === "accounts"
                      ? "Suas contas reunidas em uma única visão."
                      : "Seu espaço, suas preferências."}
              </p>
            </div>
            {section !== "settings" && (
              <button
                className="primary"
                onClick={() =>
                  section === "accounts" ? onConnect() : openEditor()
                }
                disabled={section !== "accounts" && noBanks}
              >
                {section === "accounts" ? (
                  <Landmark size={17} />
                ) : (
                  <Plus size={18} />
                )}{" "}
                {section === "accounts" ? "Conectar banco" : "Novo lançamento"}
              </button>
            )}
          </div>
          {(section === "overview" || section === "transactions") && (
            <>
              <div className="period-row">
                <div className="period-control">
                  <label htmlFor="month">Período</label>
                  <select
                    id="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {monthLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="sync-note">
                  <RefreshCw size={13} />{" "}
                  {store.synced
                    ? "Importação simulada concluída"
                    : "Conecte uma conta para começar"}
                </span>
                <button
                  className="icon-button"
                  aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
                  onClick={() => setHidden((v) => !v)}
                >
                  {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="summary-grid">
                <article className="balance-summary">
                  <div>
                    <Wallet size={18} />
                    <span>Saldo total das contas</span>
                  </div>
                  <strong>{fmt(balance)}</strong>
                  <small>
                    Saldo atual · {bank === "all" ? store.banks.length : 1}{" "}
                    {bank === "all" && store.banks.length !== 1
                      ? "contas"
                      : "conta"}
                  </small>
                  <span className="balance-decoration" aria-hidden="true" />
                </article>
                <article className="stat-summary">
                  <span className="stat-symbol income">
                    <ArrowDownLeft size={19} />
                  </span>
                  <div>
                    <span>Entradas no período</span>
                    <strong>{fmt(summary.income)}</strong>
                    <small>
                      {filtered.filter((t) => t.amount > 0).length} recebimentos
                    </small>
                  </div>
                </article>
                <article className="stat-summary">
                  <span className="stat-symbol expense">
                    <ArrowUpRight size={19} />
                  </span>
                  <div>
                    <span>Saídas no período</span>
                    <strong>{fmt(summary.expense)}</strong>
                    <small>
                      {filtered.filter((t) => t.amount < 0).length} pagamentos
                    </small>
                  </div>
                </article>
                <article className="stat-summary result-summary">
                  <span className="stat-symbol">
                    <Wallet size={19} />
                  </span>
                  <div>
                    <span>Resultado do período</span>
                    <strong>{fmt(summary.net)}</strong>
                    <small>
                      {summary.net >= 0
                        ? "Entradas menos saídas"
                        : "Saídas acima das entradas"}
                    </small>
                  </div>
                </article>
              </div>
              {section === "overview" && (
                <div className="charts-grid">
                  <section className="surface trend-panel">
                    <div className="section-heading">
                      <div>
                        <h2>O ritmo do seu dinheiro</h2>
                        <p>Resultado acumulado no mês selecionado</p>
                      </div>
                      <span className="chart-legend">
                        <i /> Entradas − saídas
                      </span>
                    </div>
                    {hidden ? (
                      <div className="chart-empty">
                        <EyeOff size={25} />
                        <p>Valores ocultos</p>
                      </div>
                    ) : filtered.length ? (
                      <div
                        className="trend-chart"
                        role="img"
                        aria-label={`Resultado acumulado em ${monthLabel(month)}: ${money(summary.net)}`}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={trend}
                            margin={{ top: 20, right: 12, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="balanceFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#246b55"
                                  stopOpacity={0.18}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#246b55"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              vertical={false}
                              stroke="#e9e8e0"
                              strokeDasharray="3 5"
                            />
                            <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                              minTickGap={30}
                              tick={{ fill: "#73776e", fontSize: 11 }}
                              tickFormatter={(v) =>
                                `${v} ${new Date(month + "-02").toLocaleDateString("pt-BR", { month: "short" })}`
                              }
                            />
                            <YAxis
                              width={61}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#73776e", fontSize: 11 }}
                              tickFormatter={(v) =>
                                new Intl.NumberFormat("pt-BR", {
                                  notation: "compact",
                                }).format(v)
                              }
                            />
                            <Tooltip
                              formatter={(v) => [
                                money(Number(v) * 100),
                                "Resultado",
                              ]}
                              labelFormatter={(v) => `Dia ${v}`}
                              contentStyle={{
                                border: "1px solid #deded3",
                                borderRadius: 10,
                                fontSize: 12,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#1c654f"
                              fill="url(#balanceFill)"
                              strokeWidth={2.5}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="chart-empty">
                        <Wallet size={28} />
                        <p>Sem movimentações neste período.</p>
                      </div>
                    )}
                  </section>
                  <section className="surface category-panel">
                    <div className="section-heading">
                      <div>
                        <h2>Para onde vai</h2>
                        <p>Despesas por categoria</p>
                      </div>
                    </div>
                    {hidden ? (
                      <div className="chart-empty">
                        <EyeOff size={25} />
                        <p>Valores ocultos</p>
                      </div>
                    ) : spent.length ? (
                      <>
                        <div className="donut-wrap">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={spent}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={59}
                                outerRadius={75}
                                paddingAngle={3}
                                stroke="none"
                                isAnimationActive={false}
                              >
                                {spent.map((s) => (
                                  <Cell
                                    key={s.name}
                                    fill={categoryColors[s.name] ?? "#7a7771"}
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v) => money(Number(v))} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="donut-center">
                            <span>Total de saídas</span>
                            <strong>{money(summary.expense)}</strong>
                          </div>
                        </div>
                        <div className="category-legend">
                          {spent.slice(0, 3).map((s) => (
                            <div key={s.name}>
                              <i
                                style={{ background: categoryColors[s.name] }}
                              />
                              <span>{s.name}</span>
                              <strong>
                                {Math.round((s.value / summary.expense) * 100)}%
                              </strong>
                            </div>
                          ))}
                          {spent.length > 3 && (
                            <button
                              className="text-button"
                              onClick={() => navigate("transactions")}
                            >
                              Ver todas as categorias <ArrowRight size={13} />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="chart-empty">
                        <Utensils size={27} />
                        <p>Nenhuma despesa neste período.</p>
                      </div>
                    )}
                  </section>
                </div>
              )}
              <section className="surface transactions-panel">
                <div className="section-heading">
                  <div>
                    <h2>
                      {section === "overview"
                        ? "Últimas movimentações"
                        : "Suas movimentações"}
                    </h2>
                    <p>{filtered.length} lançamentos com os filtros atuais</p>
                  </div>
                  {section === "overview" ? (
                    <button
                      className="text-button"
                      onClick={() => navigate("transactions")}
                    >
                      Ver todas <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      className="secondary small-button"
                      onClick={exportCsv}
                      disabled={!filtered.length}
                    >
                      <Download size={15} /> Exportar CSV
                    </button>
                  )}
                </div>
                <div className="table-filters">
                  <div className="search-input">
                    <Search size={16} />
                    <input
                      type="search"
                      aria-label="Buscar movimentações"
                      placeholder="Buscar movimentação…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <select
                    aria-label="Filtrar por banco"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                  >
                    <option value="all">Todas as contas</option>
                    {store.banks.map((id) => (
                      <option key={id} value={id}>
                        Banco {banks.find((b) => b.id === id)?.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filtrar por categoria"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">Todas as categorias</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {section === "transactions" && (
                    <select
                      aria-label="Filtrar por tipo"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="all">Entradas e saídas</option>
                      <option value="income">Entradas</option>
                      <option value="expense">Saídas</option>
                    </select>
                  )}
                  {filteredActive && (
                    <button
                      className="text-button clear-filters"
                      onClick={() => {
                        setBank("all");
                        setCategory("all");
                        setType("all");
                        setQuery("");
                      }}
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
                {filtered.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Movimentação</th>
                          <th scope="col">Categoria</th>
                          <th scope="col">Conta</th>
                          <th scope="col">Data</th>
                          <th scope="col" className="amount-cell">
                            Valor
                          </th>
                          <th scope="col">
                            <span className="sr-only">Ações</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(section === "overview"
                          ? filtered.slice(0, 5)
                          : filtered
                        ).map((t) => {
                          const Icon =
                            categoryIcons[t.category] ?? MoreHorizontal;
                          return (
                            <tr key={t.id}>
                              <td>
                                <div className="transaction-title">
                                  <span
                                    className={`category-icon ${t.amount > 0 ? "income" : ""}`}
                                  >
                                    <Icon size={17} />
                                  </span>
                                  <span>
                                    <strong>{t.description}</strong>
                                    <small>
                                      {t.source === "import"
                                        ? "Importação simulada"
                                        : "Lançamento manual"}
                                    </small>
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="category-tag">
                                  {t.category}
                                </span>
                              </td>
                              <td>
                                <span className="table-bank">
                                  <i
                                    style={{
                                      background: banks.find(
                                        (b) => b.id === t.bank,
                                      )?.color,
                                    }}
                                  />
                                  {banks.find((b) => b.id === t.bank)?.name}
                                </span>
                              </td>
                              <td className="date-cell">
                                {new Date(
                                  t.date + "T12:00:00",
                                ).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </td>
                              <td
                                className={`amount-cell ${t.amount > 0 ? "positive" : ""}`}
                              >
                                {!hidden && t.amount > 0 ? "+ " : ""}
                                {fmt(t.amount)}
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="icon-button"
                                    aria-label={`Editar ${t.description}`}
                                    onClick={() => openEditor(t)}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  {section === "transactions" && (
                                    <button
                                      className="icon-button danger"
                                      aria-label={`Excluir ${t.description}`}
                                      onClick={() =>
                                        requestConfirm({
                                          kind: "transaction",
                                          id: t.id,
                                        })
                                      }
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Search size={30} />
                    <h3>
                      {noBanks
                        ? "Seu próximo passo começa aqui."
                        : "Nenhuma movimentação encontrada."}
                    </h3>
                    <p>
                      {noBanks
                        ? "Conecte um banco fictício para explorar suas finanças."
                        : "Experimente outro período ou ajuste os filtros."}
                    </p>
                    {noBanks && (
                      <button className="primary" onClick={onConnect}>
                        Conectar meu primeiro banco <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </section>
              <p className="filter-note">
                <SlidersHorizontal size={13} /> Os filtros de busca, conta,
                categoria e tipo também se aplicam aos resumos e gráficos do
                período. O saldo total considera todo o histórico da conta.
              </p>
            </>
          )}
          {section === "accounts" && (
            <>
              <div className="account-grid">
                {store.banks.map((id) => {
                  const b = banks.find((b) => b.id === id)!;
                  return (
                    <article className="surface account-card" key={id}>
                      <div className="account-header">
                        <span
                          className="bank-logo"
                          style={{ background: b.color }}
                        >
                          {b.initial}
                        </span>
                        <span>
                          <h2>Banco {b.name}</h2>
                          <p>{b.type} · fictício</p>
                        </span>
                        <span className="connected-badge">
                          <Check size={12} /> Conectado
                        </span>
                      </div>
                      <span className="account-label">Saldo disponível</span>
                      <strong className="account-balance">
                        {fmt(accountBalance(store, id))}
                      </strong>
                      <div className="account-details">
                        <span>
                          {
                            store.transactions.filter((t) => t.bank === id)
                              .length
                          }{" "}
                          movimentações
                        </span>
                        <span>6 meses de exemplo</span>
                      </div>
                      <button
                        className="secondary wide"
                        onClick={() => {
                          setBank(id);
                          setSection("transactions");
                        }}
                      >
                        Ver movimentações <ArrowRight size={15} />
                      </button>
                      <button
                        className="text-button danger remove-account"
                        onClick={() => requestConfirm({ kind: "bank", id })}
                      >
                        <Trash2 size={14} /> Remover conexão
                      </button>
                    </article>
                  );
                })}
                <button
                  className="add-account"
                  onClick={onConnect}
                  disabled={store.banks.length === banks.length}
                >
                  <span>
                    <Plus size={24} />
                  </span>
                  <strong>
                    {store.banks.length === banks.length
                      ? "Todos os bancos conectados"
                      : "Mais contas, uma só visão."}
                  </strong>
                  <p>
                    {store.banks.length === banks.length
                      ? "As três instituições fictícias já estão no seu espaço."
                      : "Conecte outra instituição de demonstração."}
                  </p>
                </button>
              </div>
              <div className="connection-info">
                <ShieldCheck size={23} />
                <div>
                  <h2>Open Finance, em modo demonstração.</h2>
                  <p>
                    As instituições, saldos e movimentações são fictícios. A
                    importação acontece uma vez por conta, sem acesso a bancos
                    ou sincronização real.
                  </p>
                  <small>
                    Última importação:{" "}
                    {store.synced
                      ? new Date(store.synced).toLocaleString("pt-BR")
                      : "nenhuma"}
                  </small>
                </div>
              </div>
            </>
          )}
          {section === "settings" && (
            <div className="settings-layout">
              <section className="surface profile-settings">
                <h2>Como você aparece por aqui</h2>
                <p>Este perfil existe apenas neste navegador.</p>
                <form
                  key={store.profile.name + store.profile.email}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const name = String(data.get("name")).trim();
                    if (!name) return;
                    onChange({
                      ...store,
                      profile: {
                        name,
                        email: String(data.get("email")).trim(),
                      },
                    });
                    notify("Perfil atualizado.");
                  }}
                >
                  <label htmlFor="profile-name">Seu nome</label>
                  <input
                    id="profile-name"
                    name="name"
                    defaultValue={store.profile.name}
                    required
                    maxLength={60}
                  />
                  <label htmlFor="profile-email">E-mail fictício</label>
                  <input
                    id="profile-email"
                    type="email"
                    name="email"
                    defaultValue={store.profile.email}
                    required
                    maxLength={120}
                  />
                  <button className="primary" type="submit">
                    Salvar alterações <Check size={16} />
                  </button>
                </form>
              </section>
              <section className="demo-settings">
                <ShieldCheck size={28} />
                <h2>Um projeto para experimentar.</h2>
                <p>
                  Controle Financeiro é o quinto projeto do portfólio de Marcelo
                  Andrade, desenvolvido com Next.js, React, TypeScript e
                  Tailwind.
                </p>
                <p>
                  Os dados ficam no armazenamento local deste navegador. Não há
                  cadastro real, servidor de autenticação ou integração
                  bancária. Use informações fictícias.
                </p>
                <hr />
                <h3>Recomeçar a experiência</h3>
                <p>
                  Apague o perfil, as conexões e os lançamentos locais para
                  percorrer o fluxo novamente.
                </p>
                <button
                  className="secondary danger"
                  onClick={() => requestConfirm({ kind: "reset" })}
                >
                  <LogOut size={16} /> Reiniciar demonstração
                </button>
              </section>
            </div>
          )}
          <footer className="dashboard-footer">
            <span>
              Controle Financeiro <span className="gold">·</span> Marcelo
              Andrade
            </span>
            <span>
              <ShieldCheck size={12} /> Experiência demonstrativa
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegação mobile">
        {sections.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={section === id ? "active" : ""}
            aria-current={section === id ? "page" : undefined}
            onClick={() => navigate(id)}
          >
            <Icon size={20} />
            <span>
              {id === "accounts"
                ? "Contas"
                : id === "settings"
                  ? "Perfil"
                  : label}
            </span>
          </button>
        ))}
      </nav>
      {message && (
        <div className="toast" role="status">
          <Check size={18} />
          {message}
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setMessage("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <dialog
        ref={editor}
        className="editor-dialog"
        aria-labelledby="editor-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) editor.current?.close();
        }}
      >
        <div className="dialog-inner">
          <header>
            <div>
              <h2 id="editor-title">
                {editing ? "Editar lançamento" : "Novo lançamento"}
              </h2>
              <p>Mais um detalhe na sua organização.</p>
            </div>
            <button
              className="icon-button"
              aria-label="Fechar formulário"
              onClick={() => editor.current?.close()}
            >
              <X size={20} />
            </button>
          </header>
          <form key={editing?.id ?? "new"} onSubmit={submitTransaction}>
            <label htmlFor="tx-description">Descrição</label>
            <input
              id="tx-description"
              name="description"
              defaultValue={editing?.description}
              placeholder="Ex.: Mercado da semana"
              required
              maxLength={100}
            />
            <div className="form-columns">
              <div>
                <label htmlFor="tx-type">Tipo</label>
                <select
                  id="tx-type"
                  name="type"
                  defaultValue={
                    editing && editing.amount > 0 ? "income" : "expense"
                  }
                >
                  <option value="expense">Saída</option>
                  <option value="income">Entrada</option>
                </select>
              </div>
              <div>
                <label htmlFor="tx-amount">Valor (R$)</label>
                <input
                  id="tx-amount"
                  name="amount"
                  inputMode="decimal"
                  defaultValue={
                    editing
                      ? (Math.abs(editing.amount) / 100)
                          .toFixed(2)
                          .replace(".", ",")
                      : ""
                  }
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
            <div className="form-columns">
              <div>
                <label htmlFor="tx-date">Data</label>
                <input
                  id="tx-date"
                  name="date"
                  type="date"
                  defaultValue={editing?.date ?? isoToday()}
                  required
                  min="2000-01-01"
                  max="2100-12-31"
                />
              </div>
              <div>
                <label htmlFor="tx-category">Categoria</label>
                <select
                  id="tx-category"
                  name="category"
                  defaultValue={editing?.category ?? "Alimentação"}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <label htmlFor="tx-bank">Conta</label>
            <select
              id="tx-bank"
              name="bank"
              defaultValue={editing?.bank ?? store.banks[0]}
              required
            >
              {store.banks.map((id) => (
                <option key={id} value={id}>
                  Banco {banks.find((b) => b.id === id)?.name}
                </option>
              ))}
            </select>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary wide" type="submit">
              {editing ? "Salvar alterações" : "Adicionar lançamento"}
              <Check size={16} />
            </button>
          </form>
        </div>
      </dialog>
      <dialog
        ref={confirm}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
      >
        <div className="dialog-inner">
          <h2 id="confirm-title">
            {pending?.kind === "reset"
              ? "Recomeçar do zero?"
              : pending?.kind === "bank"
                ? "Remover esta conta?"
                : "Excluir este lançamento?"}
          </h2>
          <p>
            {pending?.kind === "reset"
              ? "O perfil e todos os dados desta demonstração serão apagados deste navegador."
              : pending?.kind === "bank"
                ? "A conexão e todas as movimentações dessa conta serão removidas. Você poderá conectá-la novamente depois."
                : "O lançamento será removido dos seus resumos e do saldo da conta."}
          </p>
          <div className="confirm-actions">
            <button
              className="secondary"
              autoFocus
              onClick={() => confirm.current?.close()}
            >
              Cancelar
            </button>
            <button className="primary destructive" onClick={confirmAction}>
              {pending?.kind === "reset"
                ? "Apagar e recomeçar"
                : "Confirmar exclusão"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
