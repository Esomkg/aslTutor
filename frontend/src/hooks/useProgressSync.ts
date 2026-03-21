/**
 * Syncs user progress (practiced letters, achievements, high scores)
 * between localStorage and Supabase when a user is logged in.
 */
import { useEffect, useRef, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { KEYS } from "../utils/storage";

interface ProgressRow {
  practiced_letters: string[];
  achievements: Record<string, string>;
  high_scores: object[];
}

// Pull from Supabase and merge into localStorage (Supabase wins on conflict)
async function pullProgress(userId: string) {
  const { data, error } = await supabase
    .from("user_progress")
    .select("practiced_letters, achievements, high_scores")
    .eq("user_id", userId)
    .single();

  if (error || !data) return; // no row yet, nothing to pull

  const row = data as ProgressRow;

  if (row.practiced_letters?.length) {
    localStorage.setItem(KEYS.PRACTICED_LETTERS, JSON.stringify(row.practiced_letters));
  }
  if (row.achievements && Object.keys(row.achievements).length) {
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(row.achievements));
  }
  if (row.high_scores?.length) {
    localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(row.high_scores));
  }
}

// Push current localStorage state up to Supabase (upsert)
async function pushProgress(userId: string) {
  let practiced_letters: string[] = [];
  let achievements: Record<string, string> = {};
  let high_scores: object[] = [];

  try { practiced_letters = JSON.parse(localStorage.getItem(KEYS.PRACTICED_LETTERS) || "[]"); } catch {}
  try { achievements = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS) || "{}"); } catch {}
  try { high_scores = JSON.parse(localStorage.getItem(KEYS.HIGH_SCORES) || "[]"); } catch {}

  await supabase.from("user_progress").upsert(
    { user_id: userId, practiced_letters, achievements, high_scores, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

export function useProgressSync(user: User | null) {
  const pushTimerRef = useRef<number>(0);

  // On login: pull from Supabase into localStorage
  useEffect(() => {
    if (!user) return;
    pullProgress(user.id);
  }, [user?.id]);

  // Debounced push — call this after any progress change
  const schedulePush = useCallback(() => {
    if (!user) return;
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      pushProgress(user.id);
    }, 1500);
  }, [user]);

  // Push on page unload so we don't lose the last write
  useEffect(() => {
    if (!user) return;
    const handler = () => pushProgress(user.id);
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [user]);

  return { schedulePush };
}
