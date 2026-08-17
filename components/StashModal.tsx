import React from "react";
import { useStash } from "./stash/useStash";
import { StashLayout } from "./stash/StashLayout";
import { StashItemGrid } from "./stash/StashItemGrid";
import { StashThemePreview } from "./stash/StashThemePreview";
import { StashInspector } from "./stash/StashInspector";
import { StashLoadout } from "./stash/StashLoadout";
import { StashTryOnPreview } from "./stash/StashTryOnPreview";

interface StashModalProps {
  onClose: () => void;
}

/**
 * The Stash ("Relic Vault") modal. This is a thin orchestrator: all state,
 * derivations, and handlers live in {@link useStash}, and the UI is assembled
 * from the presentational components under `./stash/*`. Each child receives the
 * shared hook state via JSX spread (`{...stash}`); every component narrows the
 * props it actually reads via `Pick<UseStashReturn, ...>`.
 */
export const StashModal: React.FC<StashModalProps> = ({ onClose }) => {
  const stash = useStash();

  return (
    <StashLayout
      {...stash}
      onClose={onClose}
      hasSelection={!!stash.selectedItem}
      tryOn={
        stash.tryOnItem && (
          <StashTryOnPreview
            item={stash.tryOnItem}
            onClose={() => stash.setTryOnItem(null)}
          />
        )
      }
    >
      <StashItemGrid {...stash} />
      {stash.selectedItem && (
        <aside className="order-3 min-w-0">
          <StashThemePreview {...stash} />
          <StashInspector {...stash} />
          <StashLoadout {...stash} />
        </aside>
      )}
    </StashLayout>
  );
};

export default StashModal;
