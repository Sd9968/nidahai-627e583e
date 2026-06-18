import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Ctx = { open: boolean; openDialog: () => void; closeDialog: () => void };
const BookDemoContext = createContext<Ctx | null>(null);

export function BookDemoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);
  return (
    <BookDemoContext.Provider value={{ open, openDialog, closeDialog }}>
      {children}
    </BookDemoContext.Provider>
  );
}

export function useBookDemo() {
  const ctx = useContext(BookDemoContext);
  if (!ctx) return { open: false, openDialog: () => {}, closeDialog: () => {} };
  return ctx;
}
