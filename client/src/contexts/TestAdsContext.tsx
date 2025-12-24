import { createContext, useContext, useState } from "react";

interface TestAdsContextType {
  showTestAds: boolean;
  setShowTestAds: (show: boolean) => void;
}

const TestAdsContext = createContext<TestAdsContextType | undefined>(undefined);

export function TestAdsProvider({ children }: { children: React.ReactNode }) {
  const [showTestAds, setShowTestAds] = useState(false);

  return (
    <TestAdsContext.Provider value={{ showTestAds, setShowTestAds }}>
      {children}
    </TestAdsContext.Provider>
  );
}

export function useTestAds() {
  const context = useContext(TestAdsContext);
  if (!context) {
    throw new Error("useTestAds must be used within TestAdsProvider");
  }
  return context;
}
