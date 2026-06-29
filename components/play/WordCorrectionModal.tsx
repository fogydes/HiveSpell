import React from "react";

interface WordCorrectionFeedback {
  type: "success" | "error";
  msg: string;
  typed?: string;
  correct?: string;
}

interface WordCorrectionModalProps {
  feedback: WordCorrectionFeedback | null;
  onClose: () => void;
}

const WordCorrectionModal: React.FC<WordCorrectionModalProps> = ({
  feedback,
  onClose,
}) => {
  if (feedback?.type !== "error" || !feedback.correct) {
    return null;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-panel border border-surface rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 flex flex-col gap-4 cursor-default"
      >
        <h2 className="font-bold text-lg text-center text-text-main tracking-wide">
          {feedback.typed ? "Incorrect Spelling" : "Time's Up"}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col items-center gap-2">
            <span className="text-[10px] text-red-300/70 font-bold uppercase tracking-widest">
              You typed
            </span>
            <span className="text-red-400 font-black text-xl font-mono tracking-wide break-all text-center">
              {feedback.typed || "—"}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col items-center gap-2">
            <span className="text-[10px] text-emerald-300/70 font-bold uppercase tracking-widest">
              Correct word
            </span>
            <span className="text-emerald-400 font-black text-xl font-mono tracking-wide break-all text-center">
              {feedback.correct}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full rounded-lg border border-surface bg-surface/30 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface/60 hover:text-text-main"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default WordCorrectionModal;
