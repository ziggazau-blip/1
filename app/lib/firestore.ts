import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type Equipa = {
  id: string;
  nome: string;
  ownerUid: string;
  ownerEmail: string;
  createdAt: number;
};

export async function criarEquipa(
  nome: string,
  user: { uid: string; email?: string | null }
) {
  const ref = await addDoc(collection(db, "equipas"), {
    nome,
    ownerUid: user.uid,
    ownerEmail: user.email || "",
    createdAt: Date.now(),
  });

  await updateDoc(doc(db, "equipas", ref.id), {
    id: ref.id,
  });

  return ref.id;
}

export async function buscarEquipasDoUser(uid: string): Promise<Equipa[]> {
  const q = query(collection(db, "equipas"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Equipa, "id">),
  }));
}

export async function buscarTodasEquipas(): Promise<Equipa[]> {
  const snap = await getDocs(collection(db, "equipas"));

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Equipa, "id">),
  }));
}

export async function buscarEquipaPorId(id: string): Promise<Equipa | null> {
  const snap = await getDoc(doc(db, "equipas", id));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Equipa, "id">),
  };
}

export async function apagarEquipa(id: string) {
  await deleteDoc(doc(db, "equipas", id));
}