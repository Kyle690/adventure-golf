import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

/**
 * Player selection while setting up a round, shared across visits to the players screen like the
 * prototype's App-level state. The venue/course travel as route params (game/new -> game/players),
 * and everything else lives in SQLite; the round itself is created on "Start the round".
 */
type RoundDraft = {
  /** null = not touched yet, which means "everyone selected" (prototype default). */
  selectedPlayerIds: number[] | null;
  setSelectedPlayerIds: (ids: number[] | null) => void;
};

const RoundDraftContext = createContext<RoundDraft | null>(null);

export function RoundDraftProvider({ children }: PropsWithChildren) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[] | null>(null);
  const value = useMemo(() => ({ selectedPlayerIds, setSelectedPlayerIds }), [selectedPlayerIds]);
  return <RoundDraftContext.Provider value={value}>{children}</RoundDraftContext.Provider>;
}

export function useRoundDraft() {
  const ctx = useContext(RoundDraftContext);
  if (!ctx) throw new Error('useRoundDraft must be used inside RoundDraftProvider');
  return ctx;
}
