import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Header: React.FC = () => {
  // 1. Use 'useAuth'
  const { userData, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    signOut(auth);
    setIsDropdownOpen(false);
  };

  // 2. Fixed top-0 header with 'pointer-events-none'
  return (
    <header className="fixed top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
      
      {/* 3. On the LEFT: Stats in emerald-themed glassmorphism */}
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

      {/* 4. On the RIGHT: Profile button and dropdown */}
      <div className="relative pointer-events-auto">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-600 p-[2px] shadow-lg hover:scale-105 transition-transform"
        >
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
             {/* Placeholder avatar */}
            <img 
               src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
               alt="Profile" 
               className="w-full h-full object-cover"
            />
          </div>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-fade-in-down">
             <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-sm text-white font-medium truncate">{user.email}</p>
             </div>
             <div className="py-1">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors">
                  Profile
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
    </header>
  );
};

export default Header;