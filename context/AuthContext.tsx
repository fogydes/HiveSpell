import React, { createContext, useContext, useEffect, useState } from 'react';
// Firebase Imports
import * as firebaseAuth from 'firebase/auth';
import * as firebaseDatabase from 'firebase/database';
import { auth, db } from '../firebase';

// Auth Listener
const { onAuthStateChanged } = firebaseAuth as any;
type User = any;

// Database References
const { ref, onValue, off, update } = firebaseDatabase as any;

// User Profile Data Interface
export interface UserData {
  stars: number;
  title: string;
  corrects: number;
  wins: number;
  username: string; // Added username
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        const unsubscribeData = onValue(userRef, (snapshot: any) => {
          const data = snapshot.val();
          if (data) {
            // Legacy Account Auto-Repair
            let finalUsername = data.username;
            if (!finalUsername) {
               finalUsername = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Player');
               // Async update to fix DB
               update(userRef, { username: finalUsername }).catch((err: any) => console.warn("Auto-fix username failed", err));
            }

            setUserData({
              stars: data.stars || 0,
              title: data.title || 'Newbee',
              corrects: data.corrects || 0,
              wins: data.wins || 0,
              username: finalUsername,
            });
          } else {
            // Initialize New User Data
            const newName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Player');
            setUserData({ 
              stars: 0, 
              title: 'Newbee', 
              corrects: 0, 
              wins: 0,
              username: newName
            });
          }
        }, (error: any) => {
          console.warn("Auth Data Fetch Error:", error);
          // Fallback
          setUserData({ 
            stars: 0, 
            title: 'Newbee', 
            corrects: 0, 
            wins: 0,
            username: currentUser.displayName || 'Player'
          });
        });

        setLoading(false);
        return () => {
           off(userRef);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};