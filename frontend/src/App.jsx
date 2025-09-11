import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export default function App() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterBias, setFilterBias] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [activeTab, setActiveTab] = useState("url");

  // Clear analysis and inputs when tab changes
  useEffect(() => {
    setAnalysis([]);
    setError(null);
    setText("");
    setUrl("");
    setVideoUrl("");
    setAudioFile(null);
  }, [activeTab]);

  // -------------------------
  // Helpers
  // -------------------------

  // Split text into sentences
  const splitSentences = (text) => {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const copyAll = () =>
    navigator.clipboard.writeText(analysis.map((a) => a.sentence).join("\n"));

  const copySentence = (sentence) =>
    navigator.clipboard.writeText(sentence || "");

  const downloadCSV = () => {
    const header = `"Sentence","Bias","Sentiment"\n`;
    const csv =
      header +
      analysis
        .map(
          (a) =>
            `"${(a.sentence || "").replace(/"/g, '""')}","${a.bias}","${a.sentiment}"`
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "analysis.csv";
    link.click();
  };

  const getLabelColor = (label) => {
    if (!label) return "bg-gray-600 text-gray-100";
    const l = label.toLowerCase();
    if (l.includes("bias")) return "bg-red-600 text-white";
    if (l.includes("neutral")) return "bg-green-600 text-white";
    return "bg-blue-600 text-white";
  };

  const getSentimentIcon = (sentiment) => {
    if (!sentiment) return "😐";
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "👍";
      case "negative":
        return "👎";
      default:
        return "😐";
    }
  };

  const filteredAnalysis = analysis.filter(
    (a) =>
      (!filterBias || a.bias === filterBias) &&
      (!filterSentiment || a.sentiment?.toLowerCase() === filterSentiment)
  );

  // -------------------------
  // API Calls
  // -------------------------

  const analyzeText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    const sentences = splitSentences(text);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences }), // send array of sentences
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setAnalysis(data.analysis || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setAnalysis(data.analysis || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeVideo = async () => {
    if (!videoUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: videoUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setAnalysis(data.analysis || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAudio = async () => {
    if (!audioFile) return;
    setLoading(true);
    setError(null);
    try {
      const fileData = await audioFile.arrayBuffer();
      const b64 = btoa(
        new Uint8Array(fileData).reduce((acc, byte) => acc + String.fromCharCode(byte), "")
      );
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: b64 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setAnalysis(data.analysis || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Render
  // -------------------------

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-6">
      <h1 className="text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 drop-shadow-lg">
        Bias & Sentiment Analyzer
      </h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-gray-700">
        {["url", "text", "video", "audio", "other"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2 px-3 font-medium text-gray-300 hover:text-white transition-colors ${
              activeTab === tab
                ? "text-white after:absolute after:-bottom-1 after:left-0 after:w-full after:h-1 after:bg-pink-500 after:rounded-full"
                : ""
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
        {/* URL Tab */}
        {activeTab === "url" && (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter article URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="p-4 rounded-xl bg-gray-900 border border-gray-600 placeholder-gray-500 text-gray-100"
            />
            <button
              onClick={analyzeUrl}
              disabled={loading}
              className="py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white hover:scale-105 transition transform disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze URL"}
            </button>
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <>
            <textarea
              rows="10"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste article or transcript..."
              className="w-full p-4 rounded-2xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none placeholder-gray-500 text-gray-100"
            />
            <div className="flex flex-wrap gap-4 mt-4">
              <button
                onClick={analyzeText}
                disabled={loading}
                className="py-3 px-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold hover:scale-105 transition transform disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
              <button
                onClick={copyAll}
                className="py-3 px-6 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition"
              >
                Copy All
              </button>
              <button
                onClick={downloadCSV}
                className="py-3 px-6 bg-green-600 rounded-xl hover:bg-green-700 transition"
              >
                Export CSV
              </button>
            </div>
          </>
        )}

        {/* Video Tab */}
        {activeTab === "video" && (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Paste video URL here..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="p-4 rounded-xl bg-gray-900 border border-gray-600 placeholder-gray-500 text-gray-100"
            />
            <button
              onClick={analyzeVideo}
              disabled={loading}
              className="py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white hover:scale-105 transition transform disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze Video"}
            </button>
          </div>
        )}

        {/* Audio Tab */}
        {activeTab === "audio" && (
          <div className="flex flex-col gap-4">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="p-4 rounded-xl bg-gray-900 border border-gray-600 text-gray-100"
            />
            <button
              onClick={analyzeAudio}
              disabled={loading || !audioFile}
              className="py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white hover:scale-105 transition transform disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze Audio"}
            </button>
          </div>
        )}

        {activeTab === "other" && (
          <div className="text-gray-400 text-center py-10">🚀 Coming soon!</div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-700 text-white rounded-lg shadow">
            Error: {error}
          </div>
        )}

        {/* Analysis Results */}
        {filteredAnalysis.length > 0 && (
          <div className="mt-8 grid gap-6">
            {filteredAnalysis.map((a, i) => {
              const sentence = a?.sentence || "N/A";
              const bias = a?.bias || "Unknown";
              const sentiment = a?.sentiment || "unknown";
              const color = getLabelColor(bias);

              return (
                <div
                  key={i}
                  className="p-5 bg-gray-900 border border-gray-700 rounded-2xl shadow-lg flex flex-col md:flex-row md:justify-between md:items-center gap-3"
                >
                  <p className="flex-1">{sentence}</p>
                  <div className="flex flex-wrap gap-3 items-center mt-2 md:mt-0">
                    <span
                      className={`px-4 py-1 rounded-full text-sm font-semibold ${color}`}
                    >
                      {bias}
                    </span>
                    <span
                      className={`px-4 py-1 rounded-full text-sm flex items-center gap-2 ${
                        sentiment.toLowerCase() === "negative"
                          ? "bg-red-700 text-white"
                          : sentiment.toLowerCase() === "positive"
                          ? "bg-green-700 text-white"
                          : "bg-gray-700 text-gray-200"
                      }`}
                    >
                      {getSentimentIcon(sentiment)} {sentiment}
                    </span>
                    <button
                      onClick={() => copySentence(sentence)}
                      className="px-3 py-1 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-sm transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}