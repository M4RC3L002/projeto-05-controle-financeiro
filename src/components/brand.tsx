import { Layers3 } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <span className="brand-symbol">
        <Layers3 size={23} />
      </span>
      <span>
        controle
        <span className="brand-second">
          financeiro<span className="brand-dot">.</span>
        </span>
      </span>
    </div>
  );
}
