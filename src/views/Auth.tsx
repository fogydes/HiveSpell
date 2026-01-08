import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const [emailOrUser, setEmailOrUser] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        let emailToUse = emailOrUser;

        // If input doesn't look like an email, assume it's a username and look it up
        if (!emailOrUser.includes('@')) {
          const usernameRef = ref(db);
          const snapshot = await get(child(usernameRef, `usernames/${emailOrUser.toLowerCase()}`));
          
          if (snapshot.exists()) {
            emailToUse = snapshot.val();
          } else {
            throw new Error("Username not found.");
          }
        }

        await signInWithEmailAndPassword(auth, emailToUse, password);
      } else {
        // Sign Up
        // 1. Check if username exists
        const usernameRef = ref(db, `usernames/${username.toLowerCase()}`);
        const userSnap = await get(usernameRef);
        if (userSnap.exists()) {
          throw new Error("Username already taken.");
        }

        // 2. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, emailOrUser, password);
        const user = userCredential.user;

        // 3. Update Profile
        await updateProfile(user, { displayName: username });

        // 4. Create DB Entries
        await set(ref(db, `users/${user.uid}`), {
          username: username,
          email: emailOrUser,
          stars: 0,
          title: 'Newbee',
          corrects: 0,
          wins: 0
        });

        // 5. Create Username Mapping (Username -> Email) for login lookup
        await set(ref(db, `usernames/${username.toLowerCase()}`), emailOrUser);
      }
      navigate('/lobby');
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
      if (msg.includes('auth/user-not-found')) msg = 'User not found.';
      if (msg.includes('auth/wrong-password')) msg = 'Incorrect password.';
      setError(msg);
    } finally {
      setLoading(false);
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
          
          {!isLogin && (
            <div>
              <label className="block text-slate-400 text-xs font-bold mb-2 ml-1">Username</label>
              <input 
                className="w-full p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                type="text" 
                placeholder="Pick a username" 
                value={username} 
                onChange={e => setUsername(e.target.value.replace(/\s/g, ''))} // No spaces
                required 
                minLength={3}
                maxLength={15}
              />
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2 ml-1">
              {isLogin ? 'Email or Username' : 'Email'}
            </label>
            <input 
              className="w-full p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              type={isLogin ? "text" : "email"}
              placeholder={isLogin ? "Enter email or username" : "Enter your email"}
              value={emailOrUser} 
              onChange={e => setEmailOrUser(e.target.value)} 
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

          <button 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-xl mt-4 transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
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