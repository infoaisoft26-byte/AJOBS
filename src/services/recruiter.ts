import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const auth = getAuth();
const db = getFirestore();

export async function createRecruiterByConsultancy(
  consultancyId: string,
  data: {
    fullName: string;
    email: string;
    phone: string;
    designation: string;
    temporaryPassword: string;
  }
) {
  const cred = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.temporaryPassword
  );

  const uid = cred.user.uid;

  await setDoc(doc(db, 'recruiters', uid), {
    recruiterId: uid,
    consultancyId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    designation: data.designation,
    status: 'active',
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'users', uid), {
    uid,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    role: 'recruiter',
    consultancyId,
    status: 'active',
    createdAt: serverTimestamp(),
  });

  return uid;
}
