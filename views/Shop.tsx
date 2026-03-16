import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../services/supabase";
import {
  SHOP_ITEMS,
  type CustomizationItem,
  isItemOwned,
} from "../data/customizationCatalog";

export const Shop: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userData } = useAuth();
  const [selectedItem, setSelectedItem] = useState<CustomizationItem | null>(
    null,
  );
  const inventory = userData?.inventory ?? [];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-hidden animate-fade-in">
      {/* Background Ambience */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.18) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(245, 158, 11, 0.14) 2px, transparent 2px)",
          backgroundSize: "36px 36px",
        }}
      ></div>

      <div className="relative w-full max-w-5xl h-[85vh] bg-[#1a1d21] border border-amber-900/50 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] flex overflow-hidden">
        {/* Left: THe Shopkeeper */}
        <div className="w-1/3 bg-gradient-to-br from-slate-900 to-amber-950/30 p-8 flex flex-col items-center justify-between border-r border-slate-800 relative">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent"></div>

          <div className="text-center z-10">
            <h2 className="text-3xl font-bold text-amber-400 font-serif tracking-widest mb-2">
              HIVE'S BOUNTY
            </h2>
            <p className="text-amber-200/60 text-sm font-mono">EST. 2026</p>
          </div>

          <div className="relative z-10 group">
            {/* Shopkeeper Image */}
            <img
              src="/assets/shopkeeper.png"
              alt="Shopkeeper"
              className="w-64 h-64 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-hover-float"
            />
            {/* Dialogue Bubble */}
            <div className="absolute -top-12 -right-4 bg-white text-slate-900 px-4 py-2 rounded-xl rounded-bl-none shadow-lg text-sm font-bold animate-pop-in">
              "Bzz! Fresh wares today!"
            </div>
          </div>

          <div className="w-full bg-slate-800/80 rounded-xl p-4 border border-slate-700 backdrop-blur-sm z-10">
            <div className="flex justify-between text-xs text-slate-400 uppercase tracking-widest mb-1">
              <span>Your Nectar</span>
              <span>Wallet</span>
            </div>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-2xl font-bold">
              <span>🍯</span>
              <span>{userData?.nectar ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Right: The Grid */}
        <div className="w-2/3 p-8 overflow-y-auto custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/50 to-transparent">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl text-white font-bold">Catalogue</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕ CLOSE
            </button>
          </div>

          {/* HEX GRID LAYOUT */}
          <div className="grid grid-cols-3 gap-4 pb-20">
            {SHOP_ITEMS.map((item) => {
              const owned = isItemOwned(inventory, item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`
                    relative aspect-square bg-slate-800 border-2 ${selectedItem?.id === item.id ? "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]" : owned ? "border-emerald-400/60" : "border-slate-700 hover:border-amber-500/50"}
                    rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all group overflow-hidden
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h4 className="text-emerald-100 font-bold text-center text-sm">
                    {item.name}
                  </h4>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {item.category}
                  </div>
                  <div className="mt-2 bg-slate-900/80 px-3 py-1 rounded-full text-amber-400 text-xs font-mono border border-slate-700">
                    {owned ? "Owned" : `${item.price} 🍯`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase Overlay (if selected) */}
        {/* Purchase Overlay (if selected) */}
        {selectedItem && (
          <div className="absolute bottom-0 right-0 w-2/3 bg-slate-900/95 border-t border-amber-500/30 p-6 backdrop-blur-xl animate-slide-up flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {selectedItem.name}
              </h3>
              <p className="text-slate-400 text-sm">
                {selectedItem.description}
              </p>
            </div>
            <PurchaseButton
              item={selectedItem}
              owned={isItemOwned(inventory, selectedItem.id)}
              onClose={() => setSelectedItem(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Extracted for cleaner state management
const PurchaseButton: React.FC<{
  item: CustomizationItem;
  owned: boolean;
  onClose: () => void;
}> = ({ item, owned, onClose }) => {
  const { refreshUser, user, userData } = useAuth();
  const { showToast } = useToast();
  const [buying, setBuying] = useState(false);
  const canAfford = (userData?.nectar ?? 0) >= item.price;

  const handleBuy = async () => {
    if (buying || !user || owned || !canAfford) return;
    setBuying(true);

    try {
      const { data, error } = await supabase.rpc("purchase_item", {
        p_user_id: user.uid, // Pass Firebase UID
        item_id: item.id,
        cost: item.price,
        category: item.category,
      });

      if (error) throw error;

      if (data && data.success) {
        showToast({
          title: "Purchase complete",
          message: `${item.name} is now in your stash.`,
          variant: "success",
        });
        await refreshUser(); // Update balance
        onClose();
      } else {
        showToast({
          title: "Purchase failed",
          message: data?.message || "Your transaction could not be completed.",
          variant: "error",
        });
      }
    } catch (err: any) {
      console.error("Purchase error details:", JSON.stringify(err, null, 2));
      showToast({
        title: "Transaction failed",
        message: err.message || "Unknown error",
        variant: "error",
      });
    } finally {
      setBuying(false);
    }
  };

  return (
    <button
      onClick={handleBuy}
      disabled={buying || owned || !canAfford}
      className={`
        bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-xl 
        shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform 
        ${buying || owned || !canAfford ? "opacity-50 cursor-not-allowed scale-100" : "hover:scale-105 active:scale-95"}
        flex items-center gap-2
      `}
    >
      {owned ? (
        <span>Already Owned</span>
      ) : !canAfford ? (
        <span>Not Enough Nectar</span>
      ) : buying ? (
        <span>Processing...</span>
      ) : (
        <>
          <span>ACQUIRE for</span>
          <span className="font-mono">{item.price}</span>
        </>
      )}
    </button>
  );
};
