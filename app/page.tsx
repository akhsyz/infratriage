"use client";

import { AppProvider } from "../lib/store";
import CommandCenter from "../components/CommandCenter";

export default function Home() {
  return (
    <AppProvider>
      <CommandCenter />
    </AppProvider>
  );
}
