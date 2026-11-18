import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import {
  deleteJournalEntry,
  ensureUserProfile,
  saveJournalEntry,
  saveMoodLog,
  signInWithGoogle,
  signOutUser,
  subscribeEntries,
  subscribeMoodLogs,
  updateLampWarmth,
} from './firebase/journalService';
import {
  AppView,
  CameraPreset,
  JournalEntry,
  MoodKey,
  MoodLog,
  UserProfile,
} from './types/journal';
import { toLocalDateKey } from './utils/dates';
import { computeStreakSummary } from './utils/streak';
import { CafeAudioEngine } from './three/cafeAudio';
import { AuthGate } from './components/AuthGate';
import { CafeCanvas } from './components/CafeCanvas';
import { CafeDock } from './components/CafeDock';
import { CalendarView } from './components/CalendarView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { JournalEditor } from './components/JournalEditor';
import { MoodTracker } from './components/MoodTracker';
import { StreakRibbon } from './components/StreakRibbon';
import { TopBar } from './components/TopBar';

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [dataError, setDataError] = useState<Error | null>(null);

  const [activeView, setActiveView] = useState<AppView>('write');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    toLocalDateKey(new Date()),
  );
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  // 3D Café Ambience state
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('desk');
  const [lampWarmth, setLampWarmth] = useState<number>(1.0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const audioEngineRef = useRef<CafeAudioEngine | null>(null);
  const warmthDebounceRef = useRef<number | null>(null);

  // Surface async Firestore subscription errors into ErrorBoundary cleanly
  if (dataError) {
    throw dataError;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) {
        try {
          const prof = await ensureUserProfile(user);
          setProfile(prof);
          setLampWarmth(prof.preferredLampWarmth);
        } catch (err) {
          setDataError(err instanceof Error ? err : new Error(String(err)));
        }
      } else {
        setProfile(null);
        setEntries([]);
        setMoodLogs([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const unsubEntries = subscribeEntries(
      authUser.uid,
      (list) => setEntries(list),
      (err) => setDataError(err),
    );
    const unsubMoods = subscribeMoodLogs(
      authUser.uid,
      (logs) => setMoodLogs(logs),
      (err) => setDataError(err),
    );
    return () => {
      unsubEntries();
      unsubMoods();
    };
  }, [authUser]);

  useEffect(() => {
    return () => {
      audioEngineRef.current?.dispose();
      if (warmthDebounceRef.current) {
        window.clearTimeout(warmthDebounceRef.current);
      }
    };
  }, []);

  const streakSummary = useMemo(() => computeStreakSummary(entries), [entries]);

  const handleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Sign-in was cancelled or unavailable.',
      );
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOutUser();
    setActiveEntryId(null);
    setActiveView('write');
  }, []);

  const handleNewEntry = useCallback((dateKey?: string) => {
    const targetDate = dateKey || toLocalDateKey(new Date());
    setSelectedDateKey(targetDate);
    setActiveEntryId(null);
    setActiveView('write');
  }, []);

  const handleSelectEntry = useCallback((entry: JournalEntry) => {
    setSelectedDateKey(entry.dateKey);
    setActiveEntryId(entry.id);
    setActiveView('write');
  }, []);

  const handleSaveEntry = useCallback(
    async (payload: {
      id?: string;
      dateKey: string;
      title: string;
      contentHtml: string;
      mood: MoodKey;
      promptUsed?: string;
    }): Promise<string> => {
      if (!authUser) throw new Error('Please sign in to save entries.');
      const savedId = await saveJournalEntry(authUser.uid, payload);
      setActiveEntryId(savedId);
      setSelectedDateKey(payload.dateKey);
      return savedId;
    },
    [authUser],
  );

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      if (!authUser) return;
      await deleteJournalEntry(authUser.uid, entryId);
      if (activeEntryId === entryId) {
        setActiveEntryId(null);
      }
    },
    [authUser, activeEntryId],
  );

  const handleSaveMoodLog = useCallback(
    async (
      dateKey: string,
      mood: MoodKey,
      note: string,
      existsAlready: boolean,
    ) => {
      if (!authUser) return;
      await saveMoodLog(authUser.uid, dateKey, mood, note, existsAlready);
    },
    [authUser],
  );

  const handleLampWarmthChange = useCallback(
    (warmth: number) => {
      setLampWarmth(warmth);
      if (!authUser) return;
      if (warmthDebounceRef.current) {
        window.clearTimeout(warmthDebounceRef.current);
      }
      warmthDebounceRef.current = window.setTimeout(() => {
        void updateLampWarmth(authUser.uid, warmth);
      }, 450);
    },
    [authUser],
  );

  const handleToggleAudio = useCallback(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new CafeAudioEngine();
    }
    if (audioEnabled) {
      audioEngineRef.current.stop();
      setAudioEnabled(false);
    } else {
      audioEngineRef.current.start();
      setAudioEnabled(true);
    }
  }, [audioEnabled]);

  const isCafeOnlyView = activeView === 'cafe';

  return (
    <ErrorBoundary>
      <div className="min-h-screen relative flex flex-col">
        {/* Full-bleed Three.js 3D Late-Night Café Scene */}
        <CafeCanvas
          preset={cameraPreset}
          lampWarmth={lampWarmth}
          isWorkspaceOverlay={!isCafeOnlyView}
        />

        {/* Top Navigation Bar */}
        <TopBar
          activeView={activeView}
          onSelectView={setActiveView}
          onNewEntry={() => handleNewEntry()}
          isAuthenticated={Boolean(authUser)}
          onSignIn={handleSignIn}
        />

        {/* Main Foreground Content */}
        {!isCafeOnlyView && (
          <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
            {!authReady ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-sm text-[#c8b9a2]">Lighting the café lamp…</p>
              </div>
            ) : !authUser ? (
              <AuthGate
                onSignIn={handleSignIn}
                onExploreCafe={() => setActiveView('cafe')}
                isSigningIn={isSigningIn}
                errorMessage={authError}
              />
            ) : (
              <div className="flex flex-col gap-6">
                <StreakRibbon
                  streak={streakSummary}
                  userName={profile?.displayName || authUser.displayName || 'Writer'}
                  onSignOut={handleSignOut}
                  onSelectDate={(dk) => {
                    setSelectedDateKey(dk);
                    setActiveView('calendar');
                  }}
                />

                {activeView === 'write' && (
                  <JournalEditor
                    entries={entries}
                    activeEntryId={activeEntryId}
                    selectedDateKey={selectedDateKey}
                    onSelectEntry={handleSelectEntry}
                    onCreateNew={handleNewEntry}
                    onSaveEntry={handleSaveEntry}
                    onDeleteEntry={handleDeleteEntry}
                  />
                )}

                {activeView === 'calendar' && (
                  <CalendarView
                    entries={entries}
                    moodLogs={moodLogs}
                    selectedDateKey={selectedDateKey}
                    onSelectDate={setSelectedDateKey}
                    onEditEntry={handleSelectEntry}
                    onWriteForDate={handleNewEntry}
                  />
                )}

                {activeView === 'moods' && (
                  <MoodTracker
                    entries={entries}
                    moodLogs={moodLogs}
                    onSaveMoodLog={handleSaveMoodLog}
                    onOpenEntry={handleSelectEntry}
                  />
                )}
              </div>
            )}
          </main>
        )}

        {/* Fullscreen 3D Café View Bottom Control Dock */}
        {isCafeOnlyView && (
          <CafeDock
            preset={cameraPreset}
            onPresetChange={setCameraPreset}
            lampWarmth={lampWarmth}
            onLampWarmthChange={handleLampWarmthChange}
            audioEnabled={audioEnabled}
            onToggleAudio={handleToggleAudio}
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed((c) => !c)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
