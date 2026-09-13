"use client";

// Demo Mode state — lives entirely in memory + localStorage. No Prisma, no
// Supabase, no server actions, no cookies. `resetDemo()` wipes the stored
// state and reseeds from demo-data.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  demoAppointments,
  demoDiaryEntries,
  demoGoals,
  demoMessages,
  demoPatients,
  demoReminders,
  demoShoppingItems,
  demoTimeline,
  type DemoAppointment,
  type DemoDiaryEntry,
  type DemoGoal,
  type DemoMessage,
  type DemoPatient,
  type DemoReminder,
  type DemoShoppingItem,
  type DemoTimelineEvent,
} from "./demo-data";

const STORAGE_KEY = "nutriopus-demo-state-v1";

interface DemoState {
  patients: DemoPatient[];
  timeline: DemoTimelineEvent[];
  goals: DemoGoal[];
  reminders: DemoReminder[];
  appointments: DemoAppointment[];
  messages: DemoMessage[];
  shoppingItems: DemoShoppingItem[];
  diaryEntries: DemoDiaryEntry[];
}

function seedState(): DemoState {
  return {
    patients: demoPatients,
    timeline: demoTimeline,
    goals: demoGoals,
    reminders: demoReminders,
    appointments: demoAppointments,
    messages: demoMessages,
    shoppingItems: demoShoppingItems,
    diaryEntries: demoDiaryEntries,
  };
}

let idCounter = 0;
function demoId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

interface DemoContextValue extends DemoState {
  hydrated: boolean;
  addWeight: (patientId: string, weight: number) => void;
  addClinicalNote: (patientId: string, text: string) => void;
  toggleReminder: (reminderId: string) => void;
  toggleShoppingItem: (itemId: string) => void;
  addDiaryEntry: (meal: string, description: string) => void;
  sendMessage: (patientId: string, sender: "NUTRITIONIST" | "PATIENT", body: string) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const autoReplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage once, on the client.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed && Array.isArray(parsed.patients)) {
          queueMicrotask(() => setState(parsed));
        }
      }
    } catch {
      // corrupted storage — keep seed data
    }
    queueMicrotask(() => setHydrated(true));
  }, []);

  // Persist on every change (post-hydration only, to not clobber storage
  // with seed data before the read happens).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full/unavailable — demo still works in memory
    }
  }, [state, hydrated]);

  useEffect(() => () => {
    if (autoReplyTimer.current) clearTimeout(autoReplyTimer.current);
  }, []);

  const addWeight = useCallback((patientId: string, weight: number) => {
    const date = new Date().toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      patients: s.patients.map((p) =>
        p.id === patientId ? { ...p, weights: [...p.weights, { date, weight }] } : p
      ),
      timeline: [
        {
          id: demoId("tl"),
          patientId,
          date,
          kind: "evaluation" as const,
          title: "Peso registrado",
          description: `Novo peso: ${weight.toFixed(1)} kg`,
        },
        ...s.timeline,
      ],
    }));
  }, []);

  const addClinicalNote = useCallback((patientId: string, text: string) => {
    const date = new Date().toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      timeline: [
        { id: demoId("tl"), patientId, date, kind: "note" as const, title: "Nota clínica", description: text },
        ...s.timeline,
      ],
    }));
  }, []);

  const toggleReminder = useCallback((reminderId: string) => {
    setState((s) => ({
      ...s,
      reminders: s.reminders.map((r) => (r.id === reminderId ? { ...r, done: !r.done } : r)),
    }));
  }, []);

  const toggleShoppingItem = useCallback((itemId: string) => {
    setState((s) => ({
      ...s,
      shoppingItems: s.shoppingItems.map((i) => (i.id === itemId ? { ...i, bought: !i.bought } : i)),
    }));
  }, []);

  const addDiaryEntry = useCallback((meal: string, description: string) => {
    const date = new Date().toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      diaryEntries: [{ id: demoId("diary"), date, meal, description, feeling: "😊" }, ...s.diaryEntries],
    }));
  }, []);

  const sendMessage = useCallback((patientId: string, sender: "NUTRITIONIST" | "PATIENT", body: string) => {
    const at = new Date().toISOString();
    setState((s) => ({
      ...s,
      messages: [...s.messages, { id: demoId("msg"), patientId, sender, body, at }],
    }));
    // Canned auto-reply so the chat feels alive in the demo.
    if (sender === "PATIENT") {
      if (autoReplyTimer.current) clearTimeout(autoReplyTimer.current);
      autoReplyTimer.current = setTimeout(() => {
        setState((s) => ({
          ...s,
          messages: [
            ...s.messages,
            {
              id: demoId("msg"),
              patientId,
              sender: "NUTRITIONIST" as const,
              body: "Recebido! Esta é uma resposta automática da demonstração. 😊",
              at: new Date().toISOString(),
            },
          ],
        }));
      }, 1200);
    }
  }, []);

  const resetDemo = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState(seedState());
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      hydrated,
      addWeight,
      addClinicalNote,
      toggleReminder,
      toggleShoppingItem,
      addDiaryEntry,
      sendMessage,
      resetDemo,
    }),
    [state, hydrated, addWeight, addClinicalNote, toggleReminder, toggleShoppingItem, addDiaryEntry, sendMessage, resetDemo]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider (/demo routes)");
  return ctx;
}
