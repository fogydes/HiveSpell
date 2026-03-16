import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
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

        // Username Login Logic
        if (!emailOrUser.includes('@')) {
          // Clean input: remove spaces and lowercase to match storage format
          const cleanUser = emailOrUser.trim().replace(/\s/g, '').toLowerCase();
          
          // Use direct path reference to get the UID mapped to this username
          const snapshot = await get(ref(db, `usernames/${cleanUser}`));
          
          if (snapshot.exists()) {
            const uid = snapshot.val();
            // Now fetch the email associated with this UID
            const userSnapshot = await get(ref(db, `users/${uid}`));
            if (userSnapshot.exists() && userSnapshot.val().email) {
               emailToUse = userSnapshot.val().email;
            } else {
               throw new Error("User data invalid.");
            }
          } else {
            throw new Error("Username not found.");
          }
        }

        await signInWithEmailAndPassword(auth, emailToUse, password);
      } else {
        // Registration Logic
        // Username Availability Check
        const cleanUsername = username.trim().replace(/\s/g, '').toLowerCase();
        const usernameRef = ref(db, `usernames/${cleanUsername}`);
        const userSnap = await get(usernameRef);
        
        if (userSnap.exists()) {
          throw new Error("Username already taken.");
        }

        // 2. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, emailOrUser, password);
        const user = userCredential.user;

        // 3. Update Profile
        await updateProfile(user, { displayName: username.trim() });

        // 4. Create DB Entries
        await set(ref(db, `users/${user.uid}`), {
          username: username.trim(),
          email: emailOrUser,
        });

        // Link Username to UID
        // CRITICAL CHANGE: We now map the name to the UID, not the email.
        await set(ref(db, `usernames/${cleanUsername}`), user.uid);
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
    <div className="theme-scene min-h-screen flex items-center justify-center bg-app p-4">
      <div className="theme-panel-shell relative w-full max-w-[430px] overflow-hidden rounded-[2rem] border bg-panel/55 p-8 backdrop-blur-xl">
        <div
          className="absolute top-0 left-1/2 h-1 w-full -translate-x-1/2 opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)",
          }}
        ></div>

        <div className="mb-8 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
            Enter The Hive
          </p>
          <h2 data-display="true" className="text-3xl font-black text-text-main">
            <span className="text-primary">{isLogin ? 'Log in' : 'Sign up'}</span>
            <span className="text-text-main"> or </span>
            <span className="text-primary">{!isLogin ? 'Log in' : 'Sign up'}</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Your profile, inventory, and arena progress follow you across the hive.
          </p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-center text-sm text-red-400">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {!isLogin && (
            <div>
              <label className="mb-2 ml-1 block text-xs font-bold text-text-muted">Username</label>
              <input 
                className="w-full rounded-xl border border-surface bg-surface/40 p-4 text-text-main transition-all placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                type="text" 
                placeholder="Pick a username" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                minLength={3}
                maxLength={15}
              />
            </div>
          )}

          <div>
            <label className="mb-2 ml-1 block text-xs font-bold text-text-muted">
              {isLogin ? 'Email or Username' : 'Email'}
            </label>
            <input 
              className="w-full rounded-xl border border-surface bg-surface/40 p-4 text-text-main transition-all placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              type={isLogin ? "text" : "email"}
              placeholder={isLogin ? "Enter email or username" : "Enter your email"}
              value={emailOrUser} 
              onChange={e => setEmailOrUser(e.target.value)} 
              required 
            />
          </div>
          
          <div>
             <label className="mb-2 ml-1 block text-xs font-bold text-text-muted">Password</label>
             <input 
              className="w-full rounded-xl border border-surface bg-surface/40 p-4 text-text-main transition-all placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button 
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-primary py-4 font-black tracking-[0.16em] text-app transition-all hover:scale-[var(--hover-scale)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: "var(--theme-shadow-glow)" }}
          >
            {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-text-muted">
            {isLogin ? 'Need an account?' : 'Already have an account?'}
            <button 
              className="ml-2 font-bold text-primary hover:underline" 
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
