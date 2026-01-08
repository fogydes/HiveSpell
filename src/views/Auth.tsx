import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/lobby');
    } catch (error) {
      setError((error as any).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050914] p-4">
      <div className="bg-[#0f172a] p-8 rounded-3xl shadow-2xl w-full max-w-[400px] border border-slate-800 relative overflow-hidden">
        
        {/* Subtle glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

        <h2 className="text-3xl font-bold mb-8 text-center">
          <span className="text-emerald-500">{isLogin ? 'Log in' : 'Sign up'}</span>
          <span className="text-white"> or </span>
          <span className="text-emerald-500">{!isLogin ? 'Log in' : 'Sign up'}</span>
        </h2>

        {error && <div className="mb-4 text-red-500 text-sm text-center bg-red-500/10 py-2 rounded">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2 ml-1">Email</label>
            <input 
              className="w-full p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              type="email" 
              placeholder="Enter your email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div>
             <label className="block text-slate-400 text-xs font-bold mb-2 ml-1">Password</label>
             <input 
              className="w-full p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-xl mt-4 transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/20">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Need an account?' : 'Already have an account?'}
            <button 
              className="ml-2 text-emerald-400 hover:text-emerald-300 font-bold hover:underline" 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
export default Auth;