import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/lobby');
    } catch (error) {
      alert("Authentication failed: " + (error as any).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleAuth} className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">{isLogin ? 'Login' : 'Sign Up'}</h2>
        <input 
          className="w-full mb-4 p-3 rounded bg-slate-900 border border-slate-600 text-white"
          type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required 
        />
        <input 
          className="w-full mb-6 p-3 rounded bg-slate-900 border border-slate-600 text-white"
          type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required 
        />
        <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-white font-bold mb-4">
          {isLogin ? 'Enter Hive' : 'Join Hive'}
        </button>
        <p className="text-center text-slate-400 text-sm cursor-pointer hover:text-white" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account?' : 'Already have one?'}
        </p>
      </form>
    </div>
  );
};
export default Auth;