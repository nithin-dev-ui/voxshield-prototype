"use client";

import { useState } from "react";

type Analysis = {
  risk: number;
  speaker: number;
  quality: number;
  level: "LOW" | "MEDIUM" | "HIGH";
};

export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const startAnalysis = () => {
    setAnalyzing(true);
    setAnalysis(null);

    setTimeout(() => {
      setAnalyzing(false);
      setAnalysis({
        risk: 87,
        speaker: 42,
        quality: 94,
        level: "HIGH",
      });
      setPage("analysis");
    }, 2500);
  };

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-800 bg-[#091625] p-6">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 font-bold text-xl text-slate-950">
              V
            </div>
            <div>
              <h1 className="text-lg font-bold">VoxShield</h1>
              <p className="text-xs text-slate-400">Voice Security AI</p>
            </div>
          </div>
        </div>

        <nav className="space-y-2">
          <NavButton
            active={page === "dashboard"}
            onClick={() => setPage("dashboard")}
            icon="⌂"
            text="Dashboard"
          />
          <NavButton
            active={page === "analysis"}
            onClick={() => setPage("analysis")}
            icon="◉"
            text="Live Analysis"
          />
          <NavButton
            active={page === "history"}
            onClick={() => setPage("history")}
            icon="◷"
            text="Detection History"
          />
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-500">SYSTEM STATUS</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-emerald-300">Protection Active</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <section className="ml-64 min-h-screen p-8">
        {page === "dashboard" && (
          <Dashboard startAnalysis={startAnalysis} />
        )}

        {page === "analysis" && (
          <AnalysisPage
            analyzing={analyzing}
            analysis={analysis}
            startAnalysis={startAnalysis}
          />
        )}

        {page === "history" && <History />}
      </section>
    </main>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${
        active
          ? "bg-cyan-500/10 text-cyan-300"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span>{icon}</span>
      {text}
    </button>
  );
}

function Dashboard({ startAnalysis }: { startAnalysis: () => void }) {
  return (
    <>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-cyan-400">REAL-TIME PROTECTION</p>
          <h2 className="mt-1 text-3xl font-bold">Security Dashboard</h2>
          <p className="mt-2 text-slate-400">
            AI-powered detection of voice cloning impersonation attacks.
          </p>
        </div>

        <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          ● System Online
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <Stat title="Calls Analyzed" value="1,284" />
        <Stat title="Threats Detected" value="37" />
        <Stat title="High Risk" value="12" />
        <Stat title="Avg. Response" value="1.8s" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-2xl border border-slate-800 bg-[#0b1a2b] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Live Voice Protection</h3>
              <p className="mt-1 text-sm text-slate-400">
                Monitor an incoming voice stream in real time.
              </p>
            </div>
            <span className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
              AI ENGINE READY
            </span>
          </div>

          <div className="mt-8 flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-[#07111f]">
            <div className="flex items-center gap-1">
              {Array.from({ length: 45 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-cyan-400/70"
                  style={{
                    height: `${15 + ((i * 17) % 75)}px`,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={startAnalysis}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            🎙 Start Real-Time Voice Analysis
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0b1a2b] p-6">
          <h3 className="font-semibold">Recent Threats</h3>

          <div className="mt-5 space-y-4">
            <Threat caller="Unknown Caller" time="2 min ago" />
            <Threat caller="Bank Support" time="18 min ago" />
            <Threat caller="Unknown Caller" time="31 min ago" />
            <Threat caller="Verified Contact" time="1 hr ago" />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0b1a2b] p-6">
        <h3 className="font-semibold">How VoxShield Protects Users</h3>

        <div className="mt-6 grid grid-cols-5 gap-3">
          {[
            ["01", "Capture", "Live audio"],
            ["02", "Analyze", "AI detection"],
            ["03", "Verify", "Speaker identity"],
            ["04", "Assess", "Risk engine"],
            ["05", "Prevent", "Alert / action"],
          ].map(([num, title, text]) => (
            <div
              key={num}
              className="rounded-xl border border-slate-800 bg-[#07111f] p-4"
            >
              <p className="text-xs text-cyan-400">{num}</p>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-xs text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AnalysisPage({
  analyzing,
  analysis,
  startAnalysis,
}: {
  analyzing: boolean;
  analysis: Analysis | null;
  startAnalysis: () => void;
}) {
  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-cyan-400">LIVE AUDIO INTELLIGENCE</p>
        <h2 className="mt-1 text-3xl font-bold">Voice Analysis</h2>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-2xl border border-slate-800 bg-[#0b1a2b] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Incoming Audio Stream</h3>
              <p className="mt-1 text-sm text-slate-400">
                Secure real-time processing
              </p>
            </div>

            {analyzing && (
              <span className="animate-pulse rounded-full bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ANALYZING...
              </span>
            )}
          </div>

          <div className="mt-8 flex h-52 items-center justify-center rounded-xl bg-[#07111f]">
            {analyzing ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
                <p className="font-medium">Analyzing voice characteristics</p>
                <p className="mt-2 text-sm text-slate-500">
                  Extracting acoustic and speaker features...
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {Array.from({ length: 55 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-cyan-400/70"
                    style={{
                      height: `${20 + ((i * 13) % 95)}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startAnalysis}
            className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950"
          >
            {analysis ? "Run New Analysis" : "Start Analysis"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0b1a2b] p-6">
          <h3 className="font-semibold">Detection Result</h3>

          {!analysis ? (
            <div className="mt-12 text-center">
              <div className="text-5xl">🛡️</div>
              <p className="mt-4 text-slate-400">
                Waiting for voice analysis
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                <p className="text-xs text-red-300">VOICE CLONE RISK</p>
                <p className="mt-2 text-5xl font-bold text-red-400">
                  {analysis.risk}%
                </p>
                <p className="mt-2 font-semibold text-red-300">
                  HIGH RISK
                </p>
              </div>

              <Metric
                name="Speaker Similarity"
                value={`${analysis.speaker}%`}
              />
              <Metric name="Audio Quality" value={`${analysis.quality}%`} />

              <div className="mt-6 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200">
                ⚠️ Possible synthetic voice detected. Identity verification is
                recommended before sensitive action.
              </div>

              <button className="mt-4 w-full rounded-xl bg-red-500 px-4 py-3 font-bold">
                🚨 Verify Identity
              </button>
            </>
          )}
        </div>
      </div>

      {analysis && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0b1a2b] p-6">
          <h3 className="font-semibold">AI Risk Assessment</h3>

          <div className="mt-5 grid grid-cols-4 gap-4">
            <RiskCard title="Synthetic Voice" value="HIGH" />
            <RiskCard title="Speaker Match" value="LOW" />
            <RiskCard title="Context Risk" value="HIGH" />
            <RiskCard title="Recommended Action" value="VERIFY" />
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ name, value }: { name: string; value: string }) {
  return (
    <div className="mt-5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{name}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-800">
        <div className="h-2 w-2/3 rounded-full bg-cyan-400" />
      </div>
    </div>
  );
}

function RiskCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#07111f] p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-2 font-bold text-cyan-300">{value}</p>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0b1a2b] p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Threat({ caller, time }: { caller: string; time: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
      <div>
        <p className="text-sm font-medium">{caller}</p>
        <p className="text-xs text-slate-500">{time}</p>
      </div>
      <span className="text-xs text-red-400">HIGH</span>
    </div>
  );
}

function History() {
  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-cyan-400">SECURITY EVENTS</p>
        <h2 className="mt-1 text-3xl font-bold">Detection History</h2>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1a2b]">
        <table className="w-full text-left">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-5">Caller</th>
              <th className="p-5">Detection</th>
              <th className="p-5">Risk</th>
              <th className="p-5">Action</th>
            </tr>
          </thead>

          <tbody>
            {[
              ["Unknown Caller", "Synthetic Voice", "HIGH", "Verification"],
              ["Bank Support", "Suspicious Pattern", "HIGH", "Blocked"],
              ["Unknown Caller", "Voice Conversion", "MEDIUM", "Warning"],
              ["Verified Contact", "Authentic Voice", "LOW", "Allowed"],
            ].map((row) => (
              <tr key={row[0] + row[1]} className="border-b border-slate-800">
                <td className="p-5">{row[0]}</td>
                <td className="p-5 text-slate-400">{row[1]}</td>
                <td className="p-5 text-red-400">{row[2]}</td>
                <td className="p-5 text-cyan-300">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}