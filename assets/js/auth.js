import { sb } from './supabase-client.js';

export async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email, password) {
  const { error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await sb.auth.signOut();
}

export function onAuthChange(cb) {
  sb.auth.onAuthStateChange((_event, session) => cb(session));
}
