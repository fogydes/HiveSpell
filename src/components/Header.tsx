import React, { useState, useEffect } from 'react';
import { useAuth, UserData } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';

const Header: React.FC = () => {
  const { userData, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<Array<{name: string, corrects: number, wins: number}>>([]);

  if (!user) return null;

  const handleLogout = () => {
    signOut(auth);
    setIsDropdownOpen(false);
  };

  const fetchLeaderboard = async () => {
    setShowLeaderboard(true);
    // Simple fetch all for now, in prod use limitToLast and orderByChild
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const entries = Object.values(data).map((u: any) => ({
        name: u.title ? "Player" : "Unknown", // In real app store names
        email: u.email, // Don't show email publicly in real app
        corrects: u.corrects || 0,
        wins: u.wins || 0
      }));
      // Sort by corrects desc
      entries.sort((a, b) => b.corrects - a.corrects);
      setLeaderboardData(entries.slice(0, 10)); // Top 10
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
        
        {/* Left: Stats */}
        <div className="flex items-center gap-3 bg-emerald-900/40 backdrop-blur-md border border-emerald-500/30 rounded-full px-5 py-2 pointer-events-auto shadow-lg shadow-emerald-900/20">
          <span className="text-xl">✨</span>
          <span className="text-emerald-100 font-bold font-mono text-lg">
            {userData?.stars || 0}
          </span>
          <div className="w-px h-5 bg-emerald-500/40 mx-1"></div>
          <span className="text-emerald-300 font-medium text-sm tracking-wide uppercase">
            {userData?.title || 'Newbee'}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 pointer-events-auto">
          {/* Shop Button */}
          <button 
            onClick={() => setShowShop(true)}
            className="p-3 rounded-full bg-slate-800/80 border border-slate-600 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all text-white"
            title="Shop"
          >
            🛒
          </button>

          {/* Leaderboard Button */}
          <button 
             onClick={fetchLeaderboard}
             className="p-3 rounded-full bg-slate-800/80 border border-slate-600 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all text-white"
             title="Leaderboard"
          >
            🏆
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-600 p-[2px] shadow-lg hover:scale-105 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-fade-in-down z-50">
                <div className="px-4 py-3 border-b border-slate-700">
                    <p className="text-sm text-white font-medium truncate">{user.email}</p>
                </div>
                <div className="py-1">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors">
                      Profile
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors">
                      Messages
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors">
                      Settings
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Logout
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-[#1a1d21] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
              <div className="p-4 flex justify-between items-center border-b border-slate-700 bg-slate-800/50">
                 <h2 className="text-xl font-bold text-white">Leaderboard</h2>
                 <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                 <div className="grid grid-cols-[1fr_80px_60px] px-6 py-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span>People</span>
                    <span className="text-right">Correct</span>
                    <span className="text-right">Wins</span>
                 </div>
                 {leaderboardData.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_60px] px-6 py-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors items-center">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-6 h-6" />
                          </div>
                          <span className="text-white font-medium">{p.name} {i < 3 && '🔥'}</span>
                       </div>
                       <div className="text-right text-emerald-400 font-mono">{p.corrects.toLocaleString()}</div>
                       <div className="text-right text-slate-300 font-mono">{p.wins.toLocaleString()}</div>
                    </div>
                 ))}
                 {leaderboardData.length === 0 && <div className="p-8 text-center text-slate-500">Loading...</div>}
              </div>
           </div>
        </div>
      )}

      {/* Shop Modal Placeholder */}
      {showShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-[#1a1d21] w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 text-center">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">Hive Shop</h2>
              <p className="text-slate-300 mb-8">Spend your stars on profile layouts, fonts, and more!</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 opacity-50">
                    <div className="h-24 bg-slate-700 rounded mb-2"></div>
                    <h3 className="font-bold">Pro Theme</h3>
                    <p className="text-xs text-slate-400">Locked (Need Busy Bee)</p>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 opacity-50">
                    <div className="h-24 bg-slate-700 rounded mb-2"></div>
                    <h3 className="font-bold">Golden Font</h3>
                    <p className="text-xs text-slate-400">500 Stars</p>
                 </div>
              </div>
              <button onClick={() => setShowShop(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">Close</button>
           </div>
        </div>
      )}
    </>
  );
};

export default Header;