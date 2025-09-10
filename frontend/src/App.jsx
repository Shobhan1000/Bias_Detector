import { useState } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState([]);

  const analyzeText = async () => {
    const res = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setAnalysis(data.analysis);
  };

  const getColor = (label) => {
    if (label.includes("left")) return "bg-blue-200";
    if (label.includes("right")) return "bg-red-200";
    if (label.includes("loaded")) return "bg-yellow-200";
    return "bg-green-200";
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <textarea
        className="w-full border p-3 rounded mb-4"
        rows="6"
        placeholder="Paste article or transcript here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={analyzeText}
        className="px-4 py-2 bg-indigo-500 text-white rounded"
      >
        Analyze
      </button>

      <div className="mt-6 space-y-3">
        {analysis.map((a, i) => (
          <p key={i} className={`p-2 rounded ${getColor(a.bias_label)}`}>
            <strong>{a.sentence}</strong>
            <span className="ml-2 text-sm text-gray-600">
              [{a.bias_label} | {a.sentiment}]
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}