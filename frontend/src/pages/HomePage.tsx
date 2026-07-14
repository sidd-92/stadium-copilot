import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

// Fans normally land on /menu/:standId directly via QR scan. This page
// exists for demo/dev convenience — manually jumping to a stand without a
// physical QR code to scan.
export function HomePage() {
  const [standId, setStandId] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (standId.trim()) navigate(`/menu/${encodeURIComponent(standId.trim())}`);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center p-4">
      <div className="w-full rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-6 py-7 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sc-ember)] mx-auto">
          <span className="text-xl font-extrabold text-white">⚡</span>
        </div>
        <h1 className="text-lg font-extrabold tracking-tight text-[var(--sc-ink)]">Stadium Copilot</h1>
        <p className="mt-1.5 text-[13px] text-[var(--sc-graphite)]">
          Scan the QR code at a food stand to view its menu and order.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 flex gap-2">
          <input
            value={standId}
            onChange={(e) => setStandId(e.target.value)}
            placeholder="Or enter a stand ID"
            className="flex-1 rounded-xl border border-[var(--sc-border)] bg-transparent px-3 py-2 text-sm text-[var(--sc-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--sc-ember)]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[var(--sc-ember)] px-4 py-2 text-sm font-bold text-white"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
