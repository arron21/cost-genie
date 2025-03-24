import { initializeApp } from 'firebase/app';
import { getAuth, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc, 
  Timestamp,
  updateDoc,
  deleteDoc // Add deleteDoc import
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDWBKFIUCL6pLHfhSZK6C3IzCTHIXgvKcA",
  authDomain: "cost-genie.firebaseapp.com",
  projectId: "cost-genie",
  storageBucket: "cost-genie.firebasestorage.app",
  messagingSenderId: "1083729143550",
  appId: "1:1083729143550:web:9df486d92b87c3b0f3e7af"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProfile {
  yearlySalary: number;
  userId: string;
  email: string;
  state?: string;
}

export async function createUserProfile(user: User, yearlySalary: number, state?: string) {
  const userProfile: UserProfile = {
    userId: user.uid,
    email: user.email || '',
    yearlySalary,
    state
  };
  
  await setDoc(doc(db, 'users', user.uid), userProfile);
  return userProfile;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  
  return null;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, updates);
  
  // Return the updated profile
  return getUserProfile(userId);
}

export interface CostEntry {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt: Date;
  favorite?: boolean; // Property for marking costs as favorites
  mustHave?: boolean; // Property for marking costs as must-haves
  need?: boolean; // Property for marking costs as essential needs
}

export async function addCostEntry(entry: Omit<CostEntry, 'id' | 'createdAt'>) {
  const costsRef = collection(db, 'costs');
  const newEntry = {
    ...entry,
    createdAt: Timestamp.now()
  };
  
  const docRef = await addDoc(costsRef, newEntry);
  return { 
    ...newEntry, 
    id: docRef.id,
    createdAt: newEntry.createdAt.toDate()
  };
}

// Add function to update cost entry
export async function updateCostEntry(costId: string, updates: Partial<Omit<CostEntry, 'id' | 'createdAt' | 'userId'>>) {
  const costRef = doc(db, 'costs', costId);
  await updateDoc(costRef, updates);
  return { id: costId, ...updates };
}

// Add new function to toggle favorite status
export async function toggleCostFavorite(costId: string, favorite: boolean) {
  const costRef = doc(db, 'costs', costId);
  await updateDoc(costRef, { favorite });
  return { id: costId, favorite };
}

// Add new function to toggle must-have status
export async function toggleCostMustHave(costId: string, mustHave: boolean) {
  const costRef = doc(db, 'costs', costId);
  await updateDoc(costRef, { mustHave });
  return { id: costId, mustHave };
}

// Add new function to toggle need status
export async function toggleCostNeed(costId: string, need: boolean) {
  const costRef = doc(db, 'costs', costId);
  await updateDoc(costRef, { need });
  return { id: costId, need };
}

// Add new function to delete a cost entry
export async function deleteCostEntry(costId: string) {
  const costRef = doc(db, 'costs', costId);
  await deleteDoc(costRef);
  return { id: costId, deleted: true };
}

export async function getUserCostHistory(userId: string): Promise<CostEntry[]> {
  const costsRef = collection(db, 'costs');
  const q = query(
    costsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate()
  })) as CostEntry[];
}
