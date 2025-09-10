import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterBias, setFilterBias] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('');
  const [activeTab, setActiveTab] = useState('url'); // URL landing tab

  const analyzeText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setAnalysis(data.analysis || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const analyzeUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setAnalysis(data.analysis || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const copyAll = () => navigator.clipboard.writeText(analysis.map(a => a.sentence).join('\n'));
  const downloadCSV = () => {
    const csv = analysis.map(a => `"${a.sentence}","${a.bias_label}","${a.sentiment}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'analysis.csv';
    link.click();
  };

  const getLabelColor = (label) => {
    if (label.includes('left')) return 'bg-blue-800 text-blue-100';
    if (label.includes('right')) return 'bg-red-800 text-red-100';
    if (label.includes('loaded')) return 'bg-yellow-800 text-yellow-100';
    return 'bg-green-800 text-green-100';
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return '👍';
      case 'negative': return '👎';
      default: return '😐';
    }
  };

  const copySentence = (sentence) => navigator.clipboard.writeText(sentence);

  const filteredAnalysis = analysis.filter(a => (!filterBias || a.bias_label === filterBias) &&
    (!filterSentiment || a.sentiment.toLowerCase() === filterSentiment));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-6">
      
      {/* Header */}
      <h1 className="text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 drop-shadow-lg">
        Bias & Sentiment Analyzer
      </h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-gray-700">
        {['url', 'text', 'video', 'audio', 'other'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2 px-3 font-medium text-gray-300 hover:text-white transition-colors
              ${activeTab === tab ? 'text-white after:absolute after:-bottom-1 after:left-0 after:w-full after:h-1 after:bg-pink-500 after:rounded-full' : ''}`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
        
        {activeTab === 'url' && (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter article URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="p-4 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-500 text-gray-100"
            />
            <button
              onClick={analyzeUrl}
              className="py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold hover:scale-105 transition transform"
            >
              {loading ? 'Analyzing...' : 'Analyze URL'}
            </button>
          </div>
        )}

        {activeTab === 'text' && (
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
                className="py-3 px-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold hover:scale-105 transition transform"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
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

        {activeTab === 'video' && (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Paste video URL here..."
              className="p-4 rounded-xl bg-gray-900 border border-gray-600 placeholder-gray-500 text-gray-100"
            />
            <button className="py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white hover:scale-105 transition transform">
              Analyze Video
            </button>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="flex flex-col gap-4">
            <input
              type="file"
              accept="audio/*"
              className="p-4 rounded-xl bg-gray-900 border border-gray-600 placeholder-gray-500 text-gray-100"
            />
            <button className="py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white hover:scale-105 transition transform">
              Analyze Audio
            </button>
          </div>
        )}

        {activeTab === 'other' && (
          <div className="text-gray-400 text-center py-10">
            🚀 Coming soon!
          </div>
        )}

        {/* Analysis Results */}
        {filteredAnalysis.length > 0 && (
          <div className="mt-8 grid gap-6">
            {filteredAnalysis.map((a, i) => (
              <div key={i} className="p-5 bg-gray-900 border border-gray-700 rounded-2xl shadow-lg flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                <p className="flex-1">{a.sentence}</p>
                <div className="flex flex-wrap gap-3 items-center mt-2 md:mt-0">
                  <span className={`px-4 py-1 rounded-full text-sm font-semibold ${getLabelColor(a.bias_label)}`}>
                    {a.bias_label}
                  </span>
                  <span className="px-4 py-1 rounded-full text-sm flex items-center gap-2 bg-gray-700 text-gray-200">
                    {getSentimentIcon(a.sentiment)} {a.sentiment}
                  </span>
                  <button
                    onClick={() => copySentence(a.sentence)}
                    className="px-3 py-1 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-sm transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}