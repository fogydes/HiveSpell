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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div className="bg-[#111] border-2 border-slate-700 rounded-xl p-8 shadow-2xl max-w-2xl w-full mx-4 flex flex-col gap-6 transform scale-100 cursor-default">
        <h2 className="font-mono font-black text-3xl text-center text-white mb-2 uppercase tracking-[0.2em] drop-shadow-md">
          Word Correction
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#2a1212] border-2 border-red-900/50 rounded-lg p-6 flex flex-col items-center gap-3 shadow-inner">
            <span className="text-xs text-red-300/80 font-bold uppercase tracking-widest">
              Your Spelling:
            </span>
            <span className="text-red-500 font-black text-3xl font-mono tracking-wide break-all text-center">
              {feedback.typed || "---"}
            </span>
          </div>

          <div className="bg-[#122a18] border-2 border-green-900/50 rounded-lg p-6 flex flex-col items-center gap-3 shadow-inner">
            <span className="text-xs text-green-300/80 font-bold uppercase tracking-widest">
              Correct Word:
            </span>
            <span className="text-green-400 font-black text-3xl font-mono tracking-wide break-all text-center">
              {feedback.correct}
            </span>
          </div>
        </div>

        <div className="mt-2 text-center text-slate-500 text-sm font-mono">
          (Click anywhere to dismiss)
        </div>
      </div>
    </div>
  );
};

export default WordCorrectionModal;
