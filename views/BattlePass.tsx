import React from "react";
import { BattlePass } from "@/components/battlepass/BattlePass";

/**
 * Battle Pass View - Seasonal Battle Pass page
 */
const BattlePassView: React.FC = () => {
  return (
    <div className="theme-scene min-h-screen flex flex-col bg-app">
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        <BattlePass className="min-h-[70vh]" />
      </main>
    </div>
  );
};

export default BattlePassView;