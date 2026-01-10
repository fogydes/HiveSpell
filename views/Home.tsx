import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="z-10 text-center flex flex-col items-center">
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-4">
          Welcome to Hive<span className="text-emerald-400">Spell</span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-light">
          The ultimate competitive spelling arena. Test your<br />
          speed and accuracy against the hive.
        </p>

        <button 
          onClick={() => handleNav(user ? "/lobby" : "/auth")} 
          className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/20 tracking-wide cursor-wide cursor-pointer"
        >
          {user ? "CONTINUE TO LOBBY" : "GET STARTED"}
        </button>
      </div>

      {/* Footer / Login Status */}
      {!user && (
        <div className="absolute bottom-8 text-slate-500 text-sm">
          Already have an account? 
          <button onClick={() => handleNav("/auth")} className="text-emerald-400 hover:underline ml-1">
            Log in
          </button>
        </div>
      )}
    </div>
  );
};
export default Home;