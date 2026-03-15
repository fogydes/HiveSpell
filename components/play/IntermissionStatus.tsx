import React from "react";

interface IntermissionStatusProps {
  status?: string;
  winnerId?: string | null;
  winnerName?: string | null;
  userId?: string;
  intermissionTime: number;
}

const IntermissionStatus: React.FC<IntermissionStatusProps> = ({
  status,
  winnerId,
  winnerName,
  userId,
  intermissionTime,
}) => {
  if (status !== "intermission") {
    return null;
  }

  const amIWinner = winnerId === userId;

  return (
    <div className="text-center">
      {winnerId ? (
        <div
          className={`font-black text-3xl uppercase tracking-widest mb-2 ${amIWinner ? "text-yellow-400 animate-pulse" : "text-white"}`}
        >
          {amIWinner ? "🏆 YOU WIN! 🏆" : `${winnerName} wins!`}
        </div>
      ) : (
        <div className="text-white font-bold text-xl uppercase tracking-widest">
          INTERMISSION
        </div>
      )}
      <div className="text-slate-400 text-lg mt-2">
        Next round in {intermissionTime}s
      </div>
    </div>
  );
};

export default IntermissionStatus;
