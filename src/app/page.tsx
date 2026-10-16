"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck,
  ShieldCheck,
  Landmark,
  Wallet,
  Layers3,
  Leaf,
  LockKeyhole,
  RefreshCw,
  CircleCheck,
  CircleHelp,
} from "lucide-react";
import {
  banks,
  importBanks,
  STORAGE_KEY,
  isStore,
  type Store,
  type BankId,
} from "@/lib/finance";
import Dashboard from "@/components/dashboard";
import { Brand } from "@/components/brand";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [stage, setStage] = useState("profile");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<BankId[]>([]);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [storageError, setStorageError] = useState("");
  const title = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isStore(parsed)) {
          setStore(parsed);
          setName(parsed.profile.name);
          setEmail(parsed.profile.email);
          setStage(parsed.complete ? "dashboard" : "banks");
        } else
          setStorageError(
            "Os dados salvos não puderam ser recuperados. Crie um novo perfil de demonstração.",
          );
      }
    } catch {
      setStorageError(
        "Não foi possível ler os dados locais. Você pode continuar nesta sessão.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    title.current?.focus();
  }, [stage, ready]);
  function save(value: Store) {
    setStore(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      setStorageError("");
    } catch {
      setStorageError(
        "O navegador não permitiu salvar. Seus dados ficam disponíveis apenas nesta sessão.",
      );
    }
  }
  useEffect(() => {
    if (stage !== "import") return;
    const timer = setInterval(
      () => setProgress((p) => Math.min(100, p + 20)),
      350,
    );
    return () => clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    if (stage === "import" && progress === 100 && store) {
      save(importBanks(store, selected));
      setStage("success");
    }
  }, [progress, stage]); // import runs once when the simulation finishes
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    save({
      version: 1,
      profile: { name: name.trim(), email: email.trim() },
      banks: [],
      transactions: [],
      synced: "",
      complete: false,
    });
    setStage("banks");
  }
  function connect() {
    setSelected([]);
    setConsent(false);
    setAdding(true);
    setStage("banks");
  }
  function finish() {
    if (store) {
      save({ ...store, complete: true });
      setAdding(false);
      setStage("dashboard");
    }
  }
  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setStore(null);
    setName("");
    setEmail("");
    setSelected([]);
    setConsent(false);
    setAdding(false);
    setStage("profile");
  }
  if (!ready)
    return (
      <div className="loading-screen">
        <Brand />
        <p>Preparando seu espaço…</p>
      </div>
    );
  if (stage === "dashboard" && store)
    return (
      <>
        <Dashboard
          store={store}
          onChange={save}
          onConnect={connect}
          onReset={reset}
        />
        {storageError && (
          <div className="storage-notice" role="status">
            {storageError}
          </div>
        )}
      </>
    );
  const reversed = stage !== "profile";
  const step =
    stage === "profile" ? 0 : stage === "banks" || stage === "consent" ? 1 : 2;
  return (
    <main className="onboarding">
      <header className="welcome-header">
        <Brand />
        <span className="demo-label">
          <span /> Projeto demonstrativo
        </span>
      </header>
      <div className="onboarding-center">
        <ol className="stepper" aria-label="Etapas do primeiro acesso">
          {["Seu perfil", "Seus bancos", "Tudo pronto"].map((s, i) => (
            <li
              key={s}
              className={i === step ? "current" : i < step ? "done" : ""}
              aria-current={i === step ? "step" : undefined}
            >
              <span>{i < step ? <Check size={13} /> : i + 1}</span>
              <b>{s}</b>
              {i < 2 && <i />}
            </li>
          ))}
        </ol>
        <section className={`onboard-card ${reversed ? "reversed" : ""}`}>
          <div className="diagonal-panel" aria-hidden="true" />
          <aside className="welcome-story">
            <div
              className="story-content"
              key={reversed ? "connected" : "welcome"}
            >
              <span className="story-icon">
                {reversed ? <Landmark size={28} /> : <Leaf size={28} />}
              </span>
              <h2>
                {reversed ? (
                  <>
                    Tudo conectado.
                    <br /> <em>Tudo mais claro.</em>
                  </>
                ) : (
                  <>
                    Seu dinheiro,
                    <br /> uma nova
                    <br /> <em>perspectiva.</em>
                  </>
                )}
              </h2>
              <p>
                {reversed
                  ? "Suas contas se encontram aqui. Você ganha espaço para cuidar do que importa."
                  : "Menos contas espalhadas. Mais clareza para viver seus planos."}
              </p>
              <div className="story-bottom">
                <span className="fine-line" />
                <span>
                  {reversed
                    ? "Uma visão completa. Do seu jeito."
                    : "Organização que começa com você."}
                </span>
              </div>
            </div>
            <div className="story-orbits" aria-hidden="true">
              <div />
              <div />
              <div />
            </div>
          </aside>
          <div className="onboard-form" key={stage}>
            {stage === "profile" && (
              <>
                <h1 ref={title} tabIndex={-1}>
                  Vamos começar
                  <br /> pelo seu nome.
                </h1>
                <p className="form-lead">
                  Crie seu perfil e dê o primeiro passo para
                  <br className="desktop-break" /> uma vida financeira mais
                  organizada.
                </p>
                <form onSubmit={create}>
                  <label htmlFor="name">Como podemos chamar você?</label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Seu nome"
                    autoComplete="given-name"
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <label htmlFor="email">Seu e-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                    required
                    maxLength={120}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="field-hint">
                    <LockKeyhole size={13} /> Sem senha. Seu perfil fica neste
                    navegador.
                  </p>
                  <button className="primary wide" type="submit">
                    Criar meu perfil <ArrowRight size={18} />
                  </button>
                </form>
                <p className="demo-explanation">
                  <CircleHelp size={15} /> Esta é uma experiência de portfólio.
                  Use um nome e um e-mail fictícios para explorar.
                </p>
              </>
            )}
            {stage === "banks" && (
              <>
                {adding ? (
                  <button
                    className="text-button back"
                    onClick={() => setStage("dashboard")}
                  >
                    <ArrowLeft size={15} /> Voltar ao dashboard
                  </button>
                ) : (
                  <button
                    className="text-button back"
                    onClick={() => setStage("profile")}
                  >
                    <ArrowLeft size={15} /> Editar perfil
                  </button>
                )}
                <h1 ref={title} tabIndex={-1}>
                  Seu dinheiro.
                  <br /> No mesmo lugar.
                </h1>
                <p className="form-lead">
                  {name.split(" ")[0]}, escolha os bancos que você quer
                  <br className="desktop-break" /> conectar à sua organização.
                </p>
                <div className="bank-options">
                  {banks.map((bank) => {
                    const connected = store?.banks.includes(bank.id);
                    return (
                      <button
                        key={bank.id}
                        className={`bank-option ${selected.includes(bank.id) ? "selected" : ""}`}
                        disabled={connected}
                        aria-pressed={selected.includes(bank.id)}
                        onClick={() => {
                          setSelected((s) =>
                            s.includes(bank.id)
                              ? s.filter((id) => id !== bank.id)
                              : [...s, bank.id],
                          );
                          setConsent(false);
                        }}
                      >
                        <span
                          className="bank-logo"
                          style={{ background: bank.color }}
                        >
                          {bank.initial}
                        </span>
                        <span>
                          <strong>Banco {bank.name}</strong>
                          <small>
                            {connected
                              ? "Já conectado"
                              : bank.type + " · fictício"}
                          </small>
                        </span>
                        <span className="selection-check">
                          {(connected || selected.includes(bank.id)) && (
                            <Check size={14} />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="primary wide"
                  disabled={!selected.length}
                  onClick={() => setStage("consent")}
                >
                  Conectar {selected.length ? selected.length : ""}{" "}
                  {selected.length === 1 ? "banco" : "bancos"}
                  <ArrowRight size={18} />
                </button>
                <p className="demo-explanation">
                  <ShieldCheck size={16} /> Conexão simulada. Nenhum dado
                  bancário real é acessado.
                </p>
              </>
            )}
            {stage === "consent" && (
              <>
                <button
                  className="text-button back"
                  onClick={() => setStage("banks")}
                >
                  <ArrowLeft size={15} /> Escolher bancos
                </button>
                <h1 ref={title} tabIndex={-1}>
                  Você está
                  <br /> no controle.
                </h1>
                <p className="form-lead">
                  Vamos simular o compartilhamento de dados de{" "}
                  {selected.length === 1 ? "uma conta" : "suas contas"}.
                </p>
                <div className="permission-box">
                  <ShieldCheck size={25} />
                  <div>
                    <strong>O que será importado</strong>
                    <p>
                      Saldos e movimentações fictícias dos últimos 6 meses, com
                      categorias de exemplo.
                    </p>
                  </div>
                </div>
                <div className="selected-bank-chips">
                  {selected.map((id) => (
                    <span key={id}>
                      Banco {banks.find((b) => b.id === id)?.name}
                    </span>
                  ))}
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    Entendi que esta conexão é uma simulação e usa apenas dados
                    fictícios.
                  </span>
                </label>
                <button
                  className="primary wide"
                  disabled={!consent}
                  onClick={() => {
                    setProgress(0);
                    setStage("import");
                  }}
                >
                  Autorizar simulação <ArrowRight size={18} />
                </button>
                <p className="demo-explanation">
                  Você poderá remover as contas a qualquer momento.
                </p>
              </>
            )}
            {stage === "import" && (
              <div className="import-state">
                <span className="import-icon">
                  <RefreshCw size={30} className="spin" />
                </span>
                <h1 ref={title} tabIndex={-1}>
                  Tudo tomando
                  <br /> forma.
                </h1>
                <p className="form-lead">
                  Organizando suas movimentações fictícias.
                </p>
                <progress
                  max={100}
                  value={progress}
                  aria-label="Progresso da importação simulada"
                />
                <p role="status">
                  {progress < 40
                    ? "Conectando às contas de demonstração…"
                    : progress < 80
                      ? "Importando e categorizando transações…"
                      : "Preparando sua visão geral…"}
                </p>
              </div>
            )}
            {stage === "success" && (
              <div className="success-state">
                <span className="success-icon">
                  <CheckCheck size={32} />
                </span>
                <h1 ref={title} tabIndex={-1}>
                  Pronto para
                  <br /> ver com clareza?
                </h1>
                <p className="form-lead">
                  Seus bancos estão conectados e suas
                  <br className="desktop-break" /> finanças já têm um lugar para
                  chamar de seu.
                </p>
                <div className="import-summary">
                  <div>
                    <strong>{selected.length}</strong>
                    <span>
                      {selected.length === 1
                        ? "banco conectado"
                        : "bancos conectados"}
                    </span>
                  </div>
                  <div>
                    <strong>
                      {
                        store?.transactions.filter((t) =>
                          selected.includes(t.bank),
                        ).length
                      }
                    </strong>
                    <span>movimentações importadas</span>
                  </div>
                </div>
                <button className="primary wide" onClick={finish}>
                  Explorar meu dashboard <ArrowRight size={18} />
                </button>
                <p className="demo-explanation">
                  <CircleCheck size={15} /> Tudo pronto. Todos os valores são
                  fictícios.
                </p>
              </div>
            )}
            {storageError && (
              <p className="inline-error" role="status">
                {storageError}
              </p>
            )}
          </div>
        </section>
        <p className="onboard-footnote">
          <ShieldCheck size={14} /> Nenhuma conexão real. Nenhuma movimentação
          de dinheiro.
        </p>
      </div>
      <footer className="welcome-footer">
        <span>Feito por Marcelo Andrade</span>
        <span>Finanças pessoais, com mais clareza.</span>
      </footer>
    </main>
  );
}
