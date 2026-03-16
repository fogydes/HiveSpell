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
    <div className="theme-scene min-h-screen flex flex-col items-center justify-center bg-app p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          className="absolute -top-12 left-[10%] h-80 w-80 rounded-full blur-3xl opacity-80"
          style={{ backgroundImage: "var(--theme-ambient-glow)" }}
        ></div>
        <div
          className="absolute bottom-[-12%] right-[8%] h-72 w-72 rounded-full blur-3xl opacity-65"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent) 0%, transparent 72%)",
          }}
        ></div>
      </div>

      <div className="theme-panel-shell relative z-10 w-full max-w-4xl rounded-[2rem] border bg-panel/35 p-8 text-center backdrop-blur-xl md:p-14">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--theme-border-strong)] bg-black/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
          Competitive Spelling Arena
        </div>

        <div className="flex flex-col items-center">
          <h1
            data-display="true"
            className="mb-4 text-5xl font-black leading-none text-text-main md:text-7xl"
          >
            Welcome to Hive<span className="text-primary">Spell</span>
          </h1>

          <p className="max-w-2xl text-base font-light leading-relaxed text-text-muted md:text-xl">
            The ultimate competitive spelling arena. Test your speed and
            accuracy against the hive and make every round feel like a ritual,
            not a drill.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={() => handleNav(user ? "/lobby" : "/auth")}
            className="rounded-full bg-primary px-10 py-4 text-lg font-black tracking-[0.18em] text-app transition-all hover:scale-[var(--hover-scale)]"
            style={{ boxShadow: "var(--theme-shadow-glow)" }}
          >
            {user ? "CONTINUE TO LOBBY" : "GET STARTED"}
          </button>
          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
            Fast rounds. Tight pressure. Clean wins.
          </p>
        </div>
      </div>

      {!user && (
        <div className="absolute bottom-8 text-sm text-text-muted">
          Already have an account? 
          <button onClick={() => handleNav("/auth")} className="ml-1 text-primary hover:underline">
            Log in
          </button>
        </div>
      )}
    </div>
  );
};
export default Home;
