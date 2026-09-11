"use client";

import { useEffect, useRef, useState } from "react";

type Analysis = {
  risk: number;
  speaker: number;
  quality: number;
  level: string;
  action: string;
  message?: string;
  time?: string;
};

type HistoryItem = Analysis & {
  id: number;
};

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [activePage, setActivePage] = useState<
    "dashboard" | "live" | "history"
  >("live");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showVerify, setShowVerify] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* LOAD HISTORY */
  useEffect(() => {
    const saved = localStorage.getItem("voice_detection_history");

    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  /* SAVE HISTORY */
  useEffect(() => {
    localStorage.setItem(
      "voice_detection_history",
      JSON.stringify(history)
    );
  }, [history]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();

      setRecording(true);
      setAnalysis(null);
      setCountdown(10);

      let seconds = 10;

      timerRef.current = setInterval(() => {
        seconds--;
        setCountdown(seconds);

        if (seconds <= 0) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error(error);
      alert("Microphone permission is required.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }

    setRecording(false);
  };

  const runAnalysis = async () => {
    if (!audioBlob) {
      alert("Please record audio first.");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const formData = new FormData();

      formData.append(
        "file",
        audioBlob,
        "recording.webm"
      );

      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Backend analysis failed");
      }

      const result = await response.json();

      const rawLevel = String(
        result.level ?? "PENDING"
      ).toUpperCase();

      const normalizedLevel = rawLevel
        .replace(" RISK", "")
        .trim();

      const newAnalysis: Analysis = {
        risk: Number(result.risk ?? 0),
        speaker: Number(
          result.speaker_similarity ?? 0
        ),
        quality: Number(
          result.audio_quality ?? 0
        ),
        level: normalizedLevel,
        action:
          result.action ??
          (normalizedLevel === "HIGH"
            ? "BLOCK"
            : normalizedLevel === "MEDIUM"
            ? "VERIFY"
            : "ALLOW"),
        message: result.message,
        time: new Date().toLocaleTimeString(),
      };

      setAnalysis(newAnalysis);

      const historyItem: HistoryItem = {
        ...newAnalysis,
        id: Date.now(),
      };

      setHistory((previous) => [
        historyItem,
        ...previous,
      ]);
    } catch (error) {
      console.error(error);

      alert(
        "Could not connect to FastAPI. Make sure the backend is running on port 8000."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
    setAudioBlob(null);
    setAnalysis(null);
    setCountdown(10);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const bars = [
    20, 30, 40, 50, 62, 72, 82, 92, 72, 55,
    30, 45, 60, 72, 84, 94, 70, 52, 35, 65,
    78, 88, 98, 76, 60, 42, 70, 84, 96, 75,
    58, 38, 55, 70, 82, 94, 74, 52, 36, 62,
    78, 90, 100, 82, 65, 45, 70, 86, 96, 72,
    54, 35, 50, 65, 78, 90, 74, 55, 38, 62,
    76, 88, 96, 72, 50,
  ];

  const riskColor =
    analysis?.level === "HIGH"
      ? "#ff4d5a"
      : analysis?.level === "MEDIUM"
      ? "#ffb347"
      : "#20e0b2";

  const riskMessage = analysis
    ? analysis.level === "HIGH"
      ? "High synthetic-voice risk detected. Block the interaction or require strong identity verification before sensitive actions."
      : analysis.level === "MEDIUM"
      ? "Moderate synthetic-voice indicators detected. Verify the caller before allowing sensitive actions."
      : "Low synthetic-voice risk detected. The interaction can proceed under normal security controls."
    : "Record and analyze an audio sample to begin detection.";

  const actionLabel = analysis
    ? analysis.action === "ALLOW"
      ? "✓ ALLOW"
      : analysis.action === "BLOCK"
      ? "⛔ BLOCK"
      : "⚠ VERIFY IDENTITY"
    : "--";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020b18",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        display: "flex",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "310px",
          minHeight: "100vh",
          background: "#071525",
          borderRight: "1px solid #1c3045",
          padding: "26px 28px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* LOGO */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "58px",
          }}
        >
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "14px",
              background: "#08c4df",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#03101c",
              fontSize: "27px",
              fontWeight: "bold",
            }}
          >
            V
          </div>

          <div>
            <div
              style={{
                fontSize: "23px",
                fontWeight: "bold",
              }}
            >
              VoxShield
            </div>

            <div
              style={{
                color: "#8fa8c2",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              Voice Security AI
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <button
            onClick={() => setActivePage("dashboard")}
            style={{
              ...navButton,
              background:
                activePage === "dashboard"
                  ? "#083246"
                  : "transparent",
              color:
                activePage === "dashboard"
                  ? "#00d7ef"
                  : "#91abc7",
            }}
          >
            ⌂ &nbsp; Dashboard
          </button>

          <button
            onClick={() => setActivePage("live")}
            style={{
              ...navButton,
              background:
                activePage === "live"
                  ? "#083246"
                  : "transparent",
              color:
                activePage === "live"
                  ? "#00d7ef"
                  : "#91abc7",
            }}
          >
            ◉ &nbsp; Live Analysis
          </button>

          <button
            onClick={() => setActivePage("history")}
            style={{
              ...navButton,
              background:
                activePage === "history"
                  ? "#083246"
                  : "transparent",
              color:
                activePage === "history"
                  ? "#00d7ef"
                  : "#91abc7",
            }}
          >
            ◷ &nbsp; Detection History
          </button>
        </div>

        {/* PROTOTYPE BADGE */}
        <div
          style={{
            marginTop: "35px",
            padding: "13px 15px",
            borderRadius: "10px",
            background: "#101f32",
            border: "1px solid #24405a",
            color: "#8fa8c2",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          <b style={{ color: "#00d7ef" }}>
            ● PROTOTYPE MODE
          </b>
          <br />
          AI-powered prototype analysis
        </div>

        {/* STATUS */}
        <div
          style={{
            position: "absolute",
            bottom: "35px",
            left: "28px",
            width: "252px",
            padding: "20px",
            borderRadius: "13px",
            border: "1px solid #1d3048",
            background: "#0a1528",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              color: "#7089a8",
              fontSize: "13px",
              marginBottom: "12px",
            }}
          >
            SYSTEM STATUS
          </div>

          <div
            style={{
              color: "#20f0c0",
              fontSize: "16px",
            }}
          >
            ● &nbsp; Protection Active
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <section
        style={{
          flex: 1,
          padding: "38px",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1460px",
            margin: "0 auto",
          }}
        >
          {/* HEADER */}
          <div style={{ marginBottom: "35px" }}>
            <div
              style={{
                color: "#00d9f5",
                fontSize: "16px",
                marginBottom: "8px",
                letterSpacing: "1px",
              }}
            >
              LIVE AUDIO INTELLIGENCE
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "39px",
                  fontWeight: "700",
                }}
              >
                {activePage === "dashboard"
                  ? "Security Dashboard"
                  : activePage === "history"
                  ? "Detection History"
                  : "Voice Analysis"}
              </h1>

              <div
                style={{
                  padding: "9px 15px",
                  borderRadius: "20px",
                  border: "1px solid #21415a",
                  background: "#0a1828",
                  color: "#7fe9f6",
                  fontSize: "13px",
                }}
              >
                ● SYSTEM ONLINE
              </div>
            </div>
          </div>

          {/* DASHBOARD */}
          {activePage === "dashboard" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(180px, 1fr))",
                  gap: "20px",
                  marginBottom: "25px",
                }}
              >
                <StatCard
                  title="TOTAL ANALYSES"
                  value={String(history.length)}
                  subtitle="Recorded sessions"
                />

                <StatCard
                  title="HIGH RISK"
                  value={String(
                    history.filter(
                      (x) => x.level === "HIGH"
                    ).length
                  )}
                  subtitle="Require blocking"
                />

                <StatCard
                  title="VERIFICATION"
                  value={String(
                    history.filter(
                      (x) =>
                        x.level === "MEDIUM" ||
                        x.level === "HIGH"
                    ).length
                  )}
                  subtitle="Require identity check"
                />
              </div>

              <div
                style={{
                  background: "#0a1a2b",
                  border: "1px solid #1b3046",
                  borderRadius: "19px",
                  padding: "30px",
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  Security Decision Engine
                </h2>

                <p
                  style={{
                    color: "#91abc5",
                    lineHeight: "1.6",
                  }}
                >
                  The system combines synthetic-voice
                  indicators, speaker similarity and
                  audio quality before recommending a
                  security action.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: "18px",
                    marginTop: "25px",
                  }}
                >
                  <DecisionBox
                    level="LOW"
                    action="ALLOW"
                    description="Low synthetic indicators"
                  />

                  <DecisionBox
                    level="MEDIUM"
                    action="WARN + VERIFY"
                    description="Additional verification required"
                  />

                  <DecisionBox
                    level="HIGH"
                    action="BLOCK"
                    description="Sensitive action should be stopped"
                  />
                </div>

                <button
                  onClick={() => setActivePage("live")}
                  style={{
                    marginTop: "30px",
                    padding: "15px 24px",
                    border: "none",
                    borderRadius: "11px",
                    background: "#08c7e5",
                    color: "#03121b",
                    fontWeight: "bold",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  🎙 Start Live Analysis
                </button>
              </div>
            </>
          )}

          {/* LIVE ANALYSIS */}
          {activePage === "live" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(500px, 1fr) 465px",
                gap: "28px",
              }}
            >
              {/* AUDIO PANEL */}
              <div
                style={{
                  background: "#0a1a2b",
                  border: "1px solid #1b3046",
                  borderRadius: "19px",
                  padding: "30px",
                  minHeight: "590px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "21px",
                      }}
                    >
                      Incoming Audio Stream
                    </h2>

                    <p
                      style={{
                        color: "#8fa8c2",
                        fontSize: "17px",
                        marginTop: "10px",
                      }}
                    >
                      Secure real-time processing
                    </p>
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      padding: "7px 10px",
                      borderRadius: "7px",
                      background: "#101f32",
                      color: "#7fe9f6",
                    }}
                  >
                    AI
                  </div>
                </div>

                {/* WAVEFORM */}
                <div
                  style={{
                    height: "255px",
                    background: "#020c1b",
                    borderRadius: "15px",
                    marginTop: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    padding: "20px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  {bars.map((height, index) => (
                    <div
                      key={index}
                      style={{
                        width: "5px",
                        height: `${height}%`,
                        minHeight: "18px",
                        borderRadius: "5px",
                        background: "#08c4df",
                        opacity:
                          recording || analyzing
                            ? 1
                            : 0.85,
                        transition: "height 0.2s",
                      }}
                    />
                  ))}
                </div>

                {recording && (
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "22px",
                      color: "#00d9f5",
                      fontSize: "18px",
                    }}
                  >
                    ● Recording... {countdown}s
                  </div>
                )}

                {audioUrl && !recording && (
                  <div style={{ marginTop: "25px" }}>
                    <audio
                      controls
                      src={audioUrl}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}

                <button
                  onClick={
                    recording
                      ? stopRecording
                      : audioUrl
                      ? runAnalysis
                      : startRecording
                  }
                  disabled={analyzing}
                  style={{
                    marginTop: "30px",
                    padding: "17px 30px",
                    borderRadius: "13px",
                    border: "none",
                    background: "#08c7e5",
                    color: "#03121b",
                    fontSize: "18px",
                    fontWeight: "bold",
                    cursor: analyzing
                      ? "not-allowed"
                      : "pointer",
                    minWidth: "225px",
                  }}
                >
                  {recording
                    ? "⏹ Stop Recording"
                    : analyzing
                    ? "⏳ Analyzing..."
                    : audioUrl
                    ? "🔍 Analyze Audio"
                    : "🎙 Run New Analysis"}
                </button>

                {audioUrl &&
                  !recording &&
                  !analyzing && (
                    <button
                      onClick={resetAnalysis}
                      style={{
                        marginTop: "15px",
                        marginLeft: "15px",
                        padding: "15px 25px",
                        borderRadius: "12px",
                        border:
                          "1px solid #29415a",
                        background: "#0d2034",
                        color: "#b9cce0",
                        fontSize: "16px",
                        cursor: "pointer",
                      }}
                    >
                      Record Again
                    </button>
                  )}
              </div>

              {/* RESULT PANEL */}
              <div
                style={{
                  background: "#0a1a2b",
                  border: "1px solid #1b3046",
                  borderRadius: "19px",
                  padding: "30px",
                  minHeight: "590px",
                  boxSizing: "border-box",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                  }}
                >
                  Detection Result
                </h2>

                {/* RISK */}
                <div
                  style={{
                    marginTop: "25px",
                    borderRadius: "15px",
                    border: `1px solid ${
                      analysis ? riskColor : "#703143"
                    }`,
                    background: "#181b27",
                    padding: "22px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: riskColor,
                      fontSize: "14px",
                      letterSpacing: "1px",
                    }}
                  >
                    SYNTHETIC VOICE RISK
                  </div>

                  <div
                    style={{
                      color: riskColor,
                      fontSize: "55px",
                      fontWeight: "bold",
                      marginTop: "5px",
                    }}
                  >
                    {analysis
                      ? `${analysis.risk.toFixed(1)}%`
                      : "--"}
                  </div>

                  <div
                    style={{
                      color: riskColor,
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  >
                    {analysis
                      ? `${analysis.level} RISK`
                      : "WAITING FOR ANALYSIS"}
                  </div>
                </div>

                {/* DECISION */}
                <div
                  style={{
                    marginTop: "18px",
                    padding: "17px",
                    borderRadius: "12px",
                    background: "#071525",
                    border: "1px solid #1e3850",
                  }}
                >
                  <div
                    style={{
                      color: "#7893ad",
                      fontSize: "12px",
                    }}
                  >
                    RECOMMENDED ACTION
                  </div>

                  <div
                    style={{
                      marginTop: "7px",
                      fontSize: "21px",
                      fontWeight: "bold",
                      color: analysis
                        ? riskColor
                        : "#7d91a6",
                    }}
                  >
                    {actionLabel}
                  </div>
                </div>

                {/* SPEAKER */}
                <Metric
                  label="Speaker Similarity"
                  value={
                    analysis
                      ? `${analysis.speaker.toFixed(1)}%`
                      : "--"
                  }
                  width={analysis?.speaker ?? 0}
                />

                <div
                  style={{
                    fontSize: "12px",
                    color: "#6f89a3",
                    marginTop: "-15px",
                  }}
                >
                  Prototype verification score — not
                  proof of identity.
                </div>

                {/* QUALITY */}
                <Metric
                  label="Audio Quality"
                  value={
                    analysis
                      ? `${analysis.quality.toFixed(1)}%`
                      : "--"
                  }
                  width={analysis?.quality ?? 0}
                />

                <div
                  style={{
                    fontSize: "12px",
                    color: "#6f89a3",
                    marginTop: "-15px",
                  }}
                >
                  Measures recording quality and
                  analyzability, not whether the voice is
                  genuine.
                </div>

                {/* RISK BREAKDOWN */}
                <div
                  style={{
                    marginTop: "22px",
                    padding: "15px",
                    borderRadius: "12px",
                    background: "#071525",
                    border: "1px solid #1d344b",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#7e98b1",
                      marginBottom: "10px",
                    }}
                  >
                    TRUST ASSESSMENT
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: "8px",
                      fontSize: "13px",
                    }}
                  >
                    <span>Speaker match</span>

                    <b style={{ textAlign: "right" }}>
                      {analysis
                        ? analysis.speaker >= 85
                          ? "HIGH"
                          : "MODERATE"
                        : "--"}
                    </b>

                    <span>Synthetic indicators</span>

                    <b
                      style={{
                        textAlign: "right",
                        color: riskColor,
                      }}
                    >
                      {analysis
                        ? analysis.level
                        : "--"}
                    </b>

                    <span>Signal quality</span>

                    <b style={{ textAlign: "right" }}>
                      {analysis
                        ? analysis.quality >= 85
                          ? "GOOD"
                          : "LIMITED"
                        : "--"}
                    </b>
                  </div>
                </div>

                {/* WARNING */}
                <div
                  style={{
                    marginTop: "18px",
                    padding: "16px",
                    borderRadius: "13px",
                    background:
                      analysis?.level === "HIGH"
                        ? "#32181d"
                        : analysis?.level === "MEDIUM"
                        ? "#302718"
                        : "#182922",
                    color: "#ffd85e",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  ⚠️ {riskMessage}
                </div>

                {/* VERIFY */}
                <button
                  disabled={!analysis}
                  onClick={() =>
                    analysis && setShowVerify(true)
                  }
                  style={{
                    marginTop: "18px",
                    width: "100%",
                    padding: "16px",
                    borderRadius: "13px",
                    border: "none",
                    background: analysis
                      ? "#ff303d"
                      : "#4a2630",
                    color: "white",
                    fontSize: "17px",
                    fontWeight: "bold",
                    cursor: analysis
                      ? "pointer"
                      : "not-allowed",
                  }}
                >
                  🚨 Verify Identity
                </button>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {activePage === "history" && (
            <div
              style={{
                background: "#0a1a2b",
                border: "1px solid #1b3046",
                borderRadius: "19px",
                padding: "30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "25px",
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>
                    Analysis Records
                  </h2>

                  <p
                    style={{
                      color: "#8099b2",
                      fontSize: "14px",
                    }}
                  >
                    Previous prototype detection sessions
                  </p>
                </div>

                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Clear all detection history?"
                        )
                      ) {
                        setHistory([]);
                      }
                    }}
                    style={{
                      padding: "10px 15px",
                      borderRadius: "9px",
                      border:
                        "1px solid #5a2932",
                      background: "#25151c",
                      color: "#ff8a91",
                      cursor: "pointer",
                    }}
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div
                  style={{
                    padding: "55px 20px",
                    textAlign: "center",
                    color: "#708aa4",
                    border:
                      "1px dashed #29425a",
                    borderRadius: "13px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "40px",
                      marginBottom: "15px",
                    }}
                  >
                    ◷
                  </div>

                  <div
                    style={{
                      fontSize: "18px",
                      color: "#a4b8cb",
                    }}
                  >
                    No detection records yet
                  </div>

                  <button
                    onClick={() =>
                      setActivePage("live")
                    }
                    style={{
                      marginTop: "20px",
                      padding: "12px 20px",
                      border: "none",
                      borderRadius: "9px",
                      background: "#08c7e5",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Start First Analysis
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: "720px",
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Time",
                          "Risk",
                          "Level",
                          "Speaker",
                          "Quality",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            style={{
                              textAlign: "left",
                              padding:
                                "14px 12px",
                              color: "#718ba5",
                              fontSize: "12px",
                              borderBottom:
                                "1px solid #20364d",
                            }}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {history.map((item) => {
                        const color =
                          item.level === "HIGH"
                            ? "#ff5c66"
                            : item.level ===
                              "MEDIUM"
                            ? "#ffb347"
                            : "#20e0b2";

                        return (
                          <tr key={item.id}>
                            <td
                              style={{
                                padding:
                                  "17px 12px",
                                borderBottom:
                                  "1px solid #152b40",
                                color: "#c2d2e0",
                              }}
                            >
                              {item.time}
                            </td>

                            <td
                              style={{
                                padding:
                                  "17px 12px",
                                borderBottom:
                                  "1px solid #152b40",
                                fontWeight: "bold",
                              }}
                            >
                              {item.risk.toFixed(1)}%
                            </td>

                            <td
                              style={{
                                padding:
                                  "17px 12px",
                                borderBottom:
                                  "1px solid #152b40",
                                color,
                                fontWeight:
                                  "bold",
                              }}
                            >
                              {item.level}
                            </td>

                            <td
                              style={{
                                padding:
                                  "17px 12px",
                                borderBottom:
                                  "1px solid #152b40",
                              }}
                            >
                              {item.speaker.toFixed(1)}%
                            </td>

                            <td
                              style={{
                                padding:
                                  "17px 12px",
                                borderBottom:
                                  "1px solid #152b40",
                              }}
                            >
                              {item.quality.toFixed(1)}%
                            </td>

                            <td
                              style={{
                                padding:
                                  "17px 12px",
                                borderBottom:
                                  "1px solid #152b40",
                                color,
                                fontWeight:
                                  "bold",
                              }}
                            >
                              {item.action}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* VERIFY MODAL */}
      {showVerify && analysis && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "480px",
              maxWidth: "100%",
              background: "#0a1a2b",
              border: "1px solid #28435d",
              borderRadius: "18px",
              padding: "30px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#ffb347",
                letterSpacing: "1px",
              }}
            >
              SECONDARY SECURITY CHECK
            </div>

            <h2
              style={{
                marginTop: "8px",
                marginBottom: "12px",
              }}
            >
              Verify Identity
            </h2>

            <p
              style={{
                color: "#91abc5",
                lineHeight: "1.6",
              }}
            >
              The voice may resemble the expected
              speaker, but voice similarity alone cannot
              establish identity.
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "18px",
                borderRadius: "12px",
                background: "#071525",
                border:
                  "1px solid #1d344b",
              }}
            >
              <div
                style={{
                  color: "#718ba5",
                  fontSize: "12px",
                }}
              >
                CURRENT RISK
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: riskColor,
                }}
              >
                {analysis.risk.toFixed(1)}% —{" "}
                {analysis.level}
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
                lineHeight: "2",
                color: "#c3d2df",
                fontSize: "14px",
              }}
            >
              ✓ Confirm through a trusted channel
              <br />
              ✓ Request secondary authentication
              <br />
              ✓ Verify the caller before sensitive
              action
            </div>

            <button
              onClick={() => setShowVerify(false)}
              style={{
                marginTop: "25px",
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "10px",
                background: "#08c7e5",
                color: "#03121b",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Verification Acknowledged
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

const navButton: React.CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: "10px",
  border: "none",
  textAlign: "left",
  fontSize: "17px",
  cursor: "pointer",
};

function Metric({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div style={{ marginTop: "22px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "9px",
        }}
      >
        <span
          style={{
            color: "#91abc5",
            fontSize: "16px",
          }}
        >
          {label}
        </span>

        <b>{value}</b>
      </div>

      <div
        style={{
          height: "9px",
          background: "#1b2b40",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(
              Math.max(width, 0),
              100
            )}%`,
            background: "#08c7e5",
            borderRadius: "10px",
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        background: "#0a1a2b",
        border: "1px solid #1b3046",
        borderRadius: "15px",
        padding: "25px",
      }}
    >
      <div
        style={{
          color: "#7089a8",
          fontSize: "12px",
          letterSpacing: "1px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "36px",
          fontWeight: "bold",
          color: "#00d9f5",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: "5px",
          color: "#728ba4",
          fontSize: "13px",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function DecisionBox({
  level,
  action,
  description,
}: {
  level: string;
  action: string;
  description: string;
}) {
  const color =
    level === "HIGH"
      ? "#ff5c66"
      : level === "MEDIUM"
      ? "#ffb347"
      : "#20e0b2";

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "13px",
        background: "#071525",
        border: `1px solid ${color}`,
      }}
    >
      <div
        style={{
          color,
          fontSize: "18px",
          fontWeight: "bold",
        }}
      >
        {level}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "15px",
          fontWeight: "bold",
        }}
      >
        {action}
      </div>

      <div
        style={{
          marginTop: "8px",
          color: "#718ba5",
          fontSize: "13px",
          lineHeight: "1.4",
        }}
      >
        {description}
      </div>
    </div>
  );
}