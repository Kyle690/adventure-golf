import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

/**
 * Selections made while setting up a round (venue -> course -> players), shared across the
 * setup and players screens like the prototype's App-level state. Nothing here is domain data:
 * venues, courses, holes and players live in SQLite; the round itself is created on "Start the round".
 */
type RoundDraft = {
  venueId: number | null;
  courseId: number | null;
  /** null = not touched yet, which means "everyone selected" (prototype default). */
  selectedPlayerIds: number[] | null;
  setVenueId: (id: number | null) => void;
  setCourseId: (id: number | null) => void;
  setSelectedPlayerIds: (ids: number[] | null) => void;
};

const RoundDraftContext = createContext<RoundDraft | null>(null);

export function RoundDraftProvider({ children }: PropsWithChildren) {
  const [venueId, setVenueId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[] | null>(null);
  const value = useMemo(
    () => ({ venueId, courseId, selectedPlayerIds, setVenueId, setCourseId, setSelectedPlayerIds }),
    [venueId, courseId, selectedPlayerIds],
  );
  return <RoundDraftContext.Provider value={value}>{children}</RoundDraftContext.Provider>;
}

export function useRoundDraft() {
  const ctx = useContext(RoundDraftContext);
  if (!ctx) throw new Error('useRoundDraft must be used inside RoundDraftProvider');
  return ctx;
}
