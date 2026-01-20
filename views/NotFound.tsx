import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0f1115] to-[#0f1115] z-0"></div>

      <div className="z-10 text-center max-w-lg mx-auto animate-fade-in-up">
        {/* Animated Bee Emoji (using CSS logic for floating effect if we had it, but simple bounce here) */}
        <div className="text-9xl mb-6 animate-bounce transition-transform duration-[2000ms]">
          🐝
        </div>

        <h1 className="text-6xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2 font-mono">
          404
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Lost in the Hive?
        </h2>

        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          The page you're looking for has flown away or doesn't exist. Don't
          worry, even the best worker bees get lost sometimes.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-lg shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 hover:scale-105 transition-all flex items-center gap-2"
          >
            <span>🏠</span> Return to Lobby
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-lg hover:bg-slate-700 hover:text-white transition-all"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* Decorative hexagon/honeycomb hints could go here if we had SVG assets */}
    </div>
  );
};

export default NotFound;
