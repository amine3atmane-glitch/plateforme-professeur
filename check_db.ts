import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  try {
    const colRef = collection(db, 'authorized_users');
    const snap = await getDocs(colRef);
    console.log(`Found ${snap.size} documents in 'authorized_users'`);
    snap.forEach(doc => {
      console.log(`Doc: ${doc.id}, Data:`, doc.data());
    });
  } catch (err) {
    console.error("Error fetching authorized_users:", err);
  }
}

checkCollections();
