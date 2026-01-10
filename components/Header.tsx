import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { auth, db } from '../firebase';
// Fix: Use namespace import for Auth and cast to any to resolve signOut export error
import * as firebaseAuth from 'firebase/auth';
import * as firebaseDatabase from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';

// Fix: Destructure signOut from namespace
const { signOut } = firebaseAuth as any;
// Cast firebaseDatabase to any to resolve TS errors
const { ref, get, query, orderByChild, limitToLast } = firebaseDatabase as any;

const Header: React.FC = () => {
  const { userData, user } = useAuth();
  const { ttsVolume, setTtsVolume, sfxVolume, setSfxVolume } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<Array<{uid: string, name: string, corrects: number, wins: number}>>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const isPlayMode = location.pathname.startsWith('/play');

  if (!user) return null;

  const handleLogout = () => {
    signOut(auth);
    setIsDropdownOpen(false);
    navigate('/auth');
  };

  const fetchLeaderboard = async () => {
    setShowLeaderboard(true);
    setLoadingLeaderboard(true);
    setLeaderboardData([]);

    try {
      // Query top 50 scores
      const usersQuery = query(ref(db, 'users'), orderByChild('corrects'), limitToLast(50));
      const snapshot = await get(usersQuery);
      
      if (snapshot.exists()) {
        const entries: Array<{uid: string, name: string, corrects: number, wins: number}> = [];

        // Iterate through the snapshot. 
        // The key of each child IS the User UID. Uniqueness is guaranteed by Firebase.
        snapshot.forEach((childSnapshot: any) => {
          const uid = childSnapshot.key;
          const u = childSnapshot.val();
          
          const name = u.username || (u.email ? u.email.split('@')[0] : "Player");

          // Basic validation:
          // 1. UID exists (implicit)
          // 2. Name is not a default placeholder
          // 3. User is not 'Unknown'
          if (name !== "Player" && name !== "Unknown") {
            entries.push({
              uid: uid,
              name: name,
              corrects: u.corrects || 0,
              wins: u.wins || 0
            });
          }
        });
        
        // Sort by score Descending (High to Low)
        // Firebase limitToLast returns them in ascending order of score, so we must reverse/sort.
        entries.sort((a, b) => b.corrects - a.corrects);
        
        // Take top 10
        setLeaderboardData(entries.slice(0, 10));
      }
    } catch (error) {
      console.error("Leaderboard access denied:", error);
      setLeaderboardData([{uid: 'error', name: "Access Denied (Check Rules)", corrects: 0, wins: 0}]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Dynamic positioning for desktop sidebar
  // If in play mode, position below the chatbox (which ends at ~80vh)
  const desktopContainerClasses = isPlayMode
    ? "hidden md:flex fixed left-4 top-[82vh] z-40 flex-row gap-2 pointer-events-auto"
    : "hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3 pointer-events-auto";

  return (
    <>
      {/* Top Header: Stats & Profile Only */}
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

        {/* Right: Profile Dropdown */}
        <div className="flex items-center gap-4 pointer-events-auto">
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
                    <p className="text-sm text-white font-medium truncate">{userData?.username || user.email}</p>
                </div>
                <div className="py-1">
                    <button 
                      onClick={() => { setShowProfile(true); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors"
                    >
                      Profile
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors opacity-50 cursor-not-allowed">
                      Messages (Soon)
                    </button>
                    <button 
                      onClick={() => { setShowSettings(true); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors"
                    >
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

      {/* MOBILE: Burger Menu (Left Middle) - Hidden on md+ */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-start gap-2 pointer-events-auto md:hidden">
         <button 
           onClick={() => setIsMenuOpen(!isMenuOpen)}
           className={`p-3 rounded-xl bg-slate-800 border border-slate-600 text-white shadow-xl hover:bg-slate-700 transition-all ${isMenuOpen ? 'bg-emerald-600 border-emerald-500' : ''}`}
         >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
         </button>

         {isMenuOpen && (
            <div className="flex flex-col gap-2 animate-fade-in-left origin-top-left">
              <MenuButtons 
                 onShop={() => { setShowShop(true); setIsMenuOpen(false); }} 
                 onLeaderboard={() => { fetchLeaderboard(); setIsMenuOpen(false); }} 
                 onInventory={() => { setShowInventory(true); setIsMenuOpen(false); }} 
              />
            </div>
         )}
      </div>

      {/* DESKTOP: Persistent Sidebar or Bottom Bar based on route */}
      <div className={desktopContainerClasses}>
         <MenuButtons 
             onShop={() => setShowShop(true)} 
             onLeaderboard={() => fetchLeaderboard()} 
             onInventory={() => setShowInventory(true)} 
             desktop
             compact={isPlayMode} // Pass compact flag for play mode
         />
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-[#1a1d21] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-scale-in">
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
                 {loadingLeaderboard ? (
                    <div className="p-8 text-center text-slate-500">Loading...</div>
                 ) : leaderboardData.length > 0 ? (
                    leaderboardData.map((p, i) => (
                      <div key={p.uid} className="grid grid-cols-[1fr_80px_60px] px-6 py-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors items-center">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`} className="w-6 h-6" alt="avatar" />
                            </div>
                            <span className="text-white font-medium">{p.name} {i < 3 && '🔥'}</span>
                         </div>
                         <div className="text-right text-emerald-400 font-mono">{p.corrects.toLocaleString()}</div>
                         <div className="text-right text-slate-300 font-mono">{p.wins.toLocaleString()}</div>
                      </div>
                    ))
                 ) : (
                    <div className="p-8 text-center text-slate-500">No data available</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-[#1a1d21] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 animate-scale-in">
              <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
              
              <div className="space-y-6">
                <div>
                   <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                     <span>TTS Volume (Voice)</span>
                     <span>{Math.round(ttsVolume * 100)}%</span>
                   </label>
                   <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={ttsVolume} 
                      onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                   />
                </div>

                <div>
                   <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                     <span>SFX Volume (Typing)</span>
                     <span>{Math.round(sfxVolume * 100)}%</span>
                   </label>
                   <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={sfxVolume} 
                      onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                   />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button onClick={() => setShowSettings(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors">
                  Close
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-[#1a1d21] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 animate-scale-in text-center">
              <h2 className="text-2xl font-bold text-white mb-6">Player Profile</h2>
              
              <div className="w-24 h-24 rounded-full bg-slate-800 mx-auto mb-4 overflow-hidden border-4 border-slate-700">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>

              <h3 className="text-xl font-bold text-white">{userData?.username || user.email}</h3>
              <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-6">{userData?.title}</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="text-2xl font-mono text-white font-bold">{userData?.corrects}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Words Correct</div>
                 </div>
                 <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="text-2xl font-mono text-white font-bold">{userData?.wins}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Wins</div>
                 </div>
              </div>

              <button onClick={() => setShowProfile(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors">
                  Close
              </button>
           </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-[#1a1d21] w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 text-center animate-scale-in">
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

      {/* Inventory Modal */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-[#1a1d21] w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 text-center animate-scale-in">
              <h2 className="text-2xl font-bold text-purple-400 mb-4">Your Inventory</h2>
              <p className="text-slate-300 mb-8">Items you have collected.</p>
              <div className="bg-slate-800/50 p-12 rounded-xl border border-slate-700 border-dashed mb-8">
                 <p className="text-slate-500">Your inventory is empty.</p>
              </div>
              <button onClick={() => setShowInventory(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">Close</button>
           </div>
        </div>
      )}
    </>
  );
};

// Extracted for reusability
const MenuButtons: React.FC<{ onShop: () => void, onLeaderboard: () => void, onInventory: () => void, desktop?: boolean, compact?: boolean }> = ({ onShop, onLeaderboard, onInventory, desktop, compact }) => {
   const baseClass = "flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 backdrop-blur border border-slate-600 text-white hover:bg-emerald-600/50 hover:border-emerald-400 transition-all shadow-xl group";
   
   // Logic for width: 
   // If compact (row mode), we only show icons or smaller widths.
   // If normal sidebar, we have hover expand.
   let widthClass = "w-48";
   if (desktop) {
      if (compact) {
          // In Play mode: Fixed square buttons or slightly rectangular
          widthClass = "w-14 justify-center"; 
      } else {
          // In Lobby mode: Expandable sidebar
          widthClass = "w-14 hover:w-48 overflow-hidden whitespace-nowrap";
      }
   }
   
   return (
      <>
        <button onClick={onShop} className={`${baseClass} ${widthClass} hover:scale-105`} title="Shop">
          <span className="text-xl min-w-[24px]">🛒</span>
          {(!compact || !desktop) && (
             <span className={`font-bold text-sm ${desktop ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300' : ''}`}>Shop</span>
          )}
        </button>
        
        <button onClick={onLeaderboard} className={`${baseClass} ${widthClass} hover:scale-105`} title="Leaderboard">
          <span className="text-xl min-w-[24px]">🏆</span>
          {(!compact || !desktop) && (
             <span className={`font-bold text-sm ${desktop ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300' : ''}`}>Leaderboard</span>
          )}
        </button>

        <button onClick={onInventory} className={`${baseClass} ${widthClass} hover:scale-105`} title="Inventory">
          <span className="text-xl min-w-[24px]">🎒</span>
          {(!compact || !desktop) && (
             <span className={`font-bold text-sm ${desktop ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300' : ''}`}>Inventory</span>
          )}
        </button>
      </>
   );
};

export default Header;