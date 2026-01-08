import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { auth, db } from '../firebase';

// 1. Define 'UserData' interface
export interface UserData {
  stars: number;
  title: string;
  corrects: number;
  wins: number; // Added wins
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
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        const unsubscribeData = onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserData({
              stars: data.stars || 0,
              title: data.title || 'Newbee',
              corrects: data.corrects || 0,
              wins: data.wins || 0,
            });
          } else {
            // Default data if new user
            setUserData({ stars: 0, title: 'Newbee', corrects: 0, wins: 0 });
          }
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