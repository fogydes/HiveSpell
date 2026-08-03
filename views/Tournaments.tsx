import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useTournaments, Tournament, TournamentMatch, TournamentBracketNode, getTournamentStatusDisplay, getTournamentFormatDisplay, TournamentParticipant } from "@/hooks/useTournaments";
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Award,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
  Crown,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Eye,
} from "lucide-react";

const Tourneys: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { theme } = useSettings();
  const {
    listTournaments,
    getTournament,
    createTournament,
    registerForTournament,
    checkInTournament,
    startTournament,
    reportMatchResult,
    getTournamentMatches,
    getTournamentBracket,
    loading,
    error,
  } = useTournaments();

  const [activeTab, setActiveTab] = useState<"browse" | "my" | "create">("browse");
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    status: "" as string,
    mode: "" as string,
    search: "",
  });
  const [selectedTournamentDetails, setSelectedTournamentDetails] = useState<{
    tournament: Tournament | null;
    matches: TournamentMatch[];
    bracket: TournamentBracketNode[];
    participants: TournamentParticipant[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  seed: number | null;
  rating_at_registration: number;
  status: string;
  current_round: number;
  final_placement: number | null;
  prize_claimed: boolean;
  joined_at: string;
  checked_in_at: string | null;
  eliminated_at: string | null;
  username?: string;
  avatar_url?: string;
}

  // Load tournaments on mount and filter change
  useEffect(() => {
    loadTournaments();
  }, [filters, page]);

  const loadTournaments = async () => {
    const data = await listTournaments(
      undefined,
      filters.status || undefined,
      filters.mode || undefined,
      20,
      page * 20
    );
    setTournaments(prev => page === 0 ? data : [...prev, ...data]);
    setHasMore(data.length === 20);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(p => p + 1);
    }
  };

  const handleTournamentClick = useCallback(async (tournament: Tournament) => {
    setDetailLoading(true);
    try {
      const [tourney, matches, bracket] = await Promise.all([
        getTournament(tournament.id),
        getTournamentMatches(tournament.id),
        getTournamentBracket(tournament.id),
      ]);
      // TODO: fetch participants
      setSelectedTournamentDetails({
        tournament: tourney,
        matches: matches || [],
        bracket: bracket || [],
        participants: [],
      });
      setSelectedTournament(tourney || tournament);
    } catch (err) {
      console.error("Failed to load tournament details:", err);
    } finally {
      setDetailLoading(false);
    }
  }, [getTournament, getTournamentMatches, getTournamentBracket]);

  const handleRegister = async (tournamentId: string) => {
    const result = await registerForTournament(tournamentId);
    if (result.success) {
      // Refresh
      loadTournaments();
      // Show success toast
    }
    alert(result.message);
  };

  const handleCheckIn = async (tournamentId: string) => {
    const result = await checkInTournament(tournamentId);
    alert(result.message);
    if (result.success) loadTournaments();
  };

  const handleStart = async (tournamentId: string) => {
    const result = await startTournament(tournamentId);
    alert(result.message);
    if (result.success) loadTournaments();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "Now";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!user) {
    return (
      <div className="theme-scene min-h-screen bg-app flex items-center justify-center p-4">
        <div className="theme-panel-shell text-center p-8 max-w-md">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold text-text-main mb-2">Tournaments</h2>
          <p className="text-text-muted mb-6">
            Compete in structured tournaments with brackets, prizes, and glory!
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-full bg-primary text-app px-8 py-3 font-semibold transition-colors hover:opacity-90"
          >
            Log In to Compete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`theme-scene min-h-screen bg-app transition-colors duration-1000 ${theme}`}>
      {/* Page Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-app/95 to-app/0 backdrop-blur-sm py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                <Trophy className="text-primary" />
                Tournaments
              </h1>
              <p className="text-text-muted mt-1">
                Structured competition with brackets, prizes, and seasonal championships
              </p>
            </div>
            {activeTab !== "create" && (
              <button
                onClick={() => setActiveTab("create")}
                className="rounded-full bg-primary text-app px-6 py-3 font-semibold transition-colors hover:opacity-90 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Tournament
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="fixed top-24 left-0 right-0 z-30 bg-app/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto">
          <nav className="flex gap-1 px-4 py-2 overflow-x-auto" role="tablist">
            {([
              { id: "browse", label: "Browse", icon: <Trophy className="w-4 h-4" /> },
              { id: "my", label: "My Tournaments", icon: <Users className="w-4 h-4" /> },
              { id: "create", label: "Create", icon: <Plus className="w-4 h-4" /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(0);
                  setHasMore(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary border-b-2 border-primary"
                    : "text-text-muted hover:text-text-main hover:bg-surface"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="pt-40 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Browse Tab */}
          {activeTab === "browse" && (
            <div className="space-y-6 animate-fade-in">
              {/* Filters */}
              <div className="theme-panel-shell rounded-xl border bg-panel/50 p-4 backdrop-blur-xl">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search tournaments..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value, search: "" })}
                    className="px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="registration">Registering</option>
                    <option value="check_in">Check-In</option>
                    <option value="in_progress">Live</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    value={filters.mode}
                    onChange={(e) => setFilters({ ...filters, mode: e.target.value, search: "" })}
                    className="px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Modes</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="genius">Genius</option>
                    <option value="competitive">Competitive</option>
                  </select>
                  <button
                    onClick={() => setFilters({ status: "", mode: "", search: "" })}
                    className="px-4 py-2 text-text-muted hover:text-text-main transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Tournament List */}
              <div className="space-y-4">
                {tournaments.length === 0 && !loading ? (
                  <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-12 text-center backdrop-blur-xl">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-text-muted/50" />
                    <h3 className="text-lg font-semibold text-text-main mb-2">No tournaments found</h3>
                    <p className="text-text-muted">Try adjusting your filters or check back later.</p>
                  </div>
                ) : (
                  tournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      onClick={() => handleTournamentClick(tournament)}
                      onRegister={() => handleRegister(tournament.id)}
                      onCheckIn={() => handleCheckIn(tournament.id)}
                      userId={user.uid}
                      formatDate={formatDate}
                      formatRelativeTime={formatRelativeTime}
                      getTournamentStatusDisplay={getTournamentStatusDisplay}
                      getTournamentFormatDisplay={getTournamentFormatDisplay}
                    />
                  ))
                )}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-3 bg-surface border border-border rounded-xl font-medium text-text-main hover:bg-surface/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* My Tournaments Tab */}
          {activeTab === "my" && (
            <div className="space-y-6 animate-fade-in">
              <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-text-main mb-4">Your Tournaments</h3>
                <p className="text-text-muted mb-6">
                    Tournament registration history and active competitions will appear here.
                    <br />
                    Browse tournaments and register to see them in this list.
                </p>
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-text-muted/50" />
                  <p className="text-text-muted">No tournament registrations yet</p>
                  <button
                    onClick={() => setActiveTab("browse")}
                    className="mt-4 px-6 py-2 bg-primary text-app rounded-xl font-semibold hover:opacity-90"
                  >
                    Browse Tournaments
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Tournament Tab */}
          {activeTab === "create" && (
            <CreateTournamentForm
              onCreate={createTournament}
              onCancel={() => setActiveTab("browse")}
            />
          )}

          {/* Tournament Detail Modal */}
          {selectedTournamentDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-4xl max-h-[90vh] theme-panel-shell rounded-2xl border bg-panel/95 overflow-hidden flex flex-col">
                <TournamentDetailModal
                  tournament={selectedTournamentDetails}
                  onClose={() => {
                    setSelectedTournamentDetails(null);
                    setSelectedTournament(null);
                  }}
                  userId={user.uid}
                  onRegister={handleRegister}
                  onCheckIn={handleCheckIn}
                  onStart={handleStart}
                  formatDate={formatDate}
                  getTournamentStatusDisplay={getTournamentStatusDisplay}
                  getTournamentFormatDisplay={getTournamentFormatDisplay}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Tournament Card Component
interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
  onRegister: () => void;
  onCheckIn: () => void;
  userId: string;
  formatDate: (dateStr: string) => string;
  formatRelativeTime: (dateStr: string) => string;
  getTournamentStatusDisplay: (status: Tournament['status']) => { label: string; color: string; icon: string };
  getTournamentFormatDisplay: (format: string) => string;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  onClick,
  onRegister,
  onCheckIn,
  userId,
  formatDate,
  formatRelativeTime,
  getTournamentStatusDisplay,
  getTournamentFormatDisplay,
}) => {
  const statusDisplay = getTournamentStatusDisplay(tournament.status);
  const isRegistered = tournament.is_registered;
  const canRegister = tournament.status === 'registration' && !isRegistered;
  const canCheckIn = tournament.status === 'check_in' && isRegistered;

  return (
    <div
      onClick={onClick}
      className={`theme-panel-shell rounded-xl border bg-panel/50 p-4 backdrop-blur-xl transition-all cursor-pointer hover:border-primary/30 hover:bg-primary/5 ${isRegistered ? 'ring-2 ring-primary/20' : ''}`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusDisplay.color}`}>
            {statusDisplay.icon} {statusDisplay.label}
          </span>
          {tournament.prize_pool_nectar > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-400">
              <DollarSign className="w-3 h-3 inline mr-1" />
              {tournament.prize_pool_nectar.toLocaleString()}
            </span>
          )}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-main truncate">{tournament.name}</h3>
          <p className="text-sm text-text-muted truncate mt-1">{tournament.description || "No description"}</p>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {tournament.participant_count}/{tournament.max_participants}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatRelativeTime(tournament.starts_at)}
            </span>
            <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
              {getTournamentFormatDisplay(tournament.format)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:ml-auto">
          {canRegister ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRegister(); }}
              className="px-4 py-2 bg-primary text-app rounded-lg font-medium hover:opacity-90 transition-colors text-sm"
            >
              Register
            </button>
          ) : canCheckIn ? (
            <button
              onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:opacity-90 transition-colors text-sm"
            >
              Check In
            </button>
          ) : isRegistered ? (
            <span className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg font-medium text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Registered
            </span>
          ) : tournament.status === 'in_progress' ? (
            <span className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium text-sm animate-pulse">
              Live
            </span>
          ) : tournament.status === 'completed' ? (
            <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg font-medium text-sm">
              Completed
            </span>
          ) : (
            <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-medium text-sm">
              Closed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Tournament Detail Modal
interface TournamentDetailModalProps {
  tournament: {
    tournament: Tournament | null;
    matches: any[];
    bracket: any[];
    participants: any[];
  };
  onClose: () => void;
  userId: string;
  onRegister: (tournamentId: string) => void;
  onCheckIn: (tournamentId: string) => void;
  onStart: (tournamentId: string) => void;
  formatDate: (dateStr: string) => string;
  getTournamentStatusDisplay: (status: Tournament['status']) => { label: string; color: string; icon: string };
  getTournamentFormatDisplay: (format: string) => string;
}

const TournamentDetailModal: React.FC<TournamentDetailModalProps> = ({
  tournament,
  onClose,
  userId,
  onRegister,
  onCheckIn,
  onStart,
  formatDate,
  getTournamentStatusDisplay,
  getTournamentFormatDisplay,
}) => {
  const { tournament: t, matches, bracket, participants } = tournament;
  const statusDisplay = t ? getTournamentStatusDisplay(t.status) : { label: '', color: '', icon: '' };

  if (!t) return null;

  const isCreator = t.created_by === userId;
  const isRegistered = t.is_registered;
  const canRegister = t.status === 'registration' && !isRegistered;
  const canCheckIn = t.status === 'check_in' && isRegistered;
  const canStart = t.status === 'registration' && isCreator;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusDisplay.color}`}>
            <span className="text-2xl">{statusDisplay.icon}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main">{t.name}</h2>
            <p className="text-sm text-text-muted">{t.description || "No description"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content Tabs */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="theme-panel-shell rounded-xl border bg-panel/50 p-4">
              <h4 className="text-sm font-medium text-text-muted mb-2">Format</h4>
              <p className="text-lg font-semibold text-text-main">{getTournamentFormatDisplay(t.format)}</p>
            </div>
            <div className="theme-panel-shell rounded-xl border bg-panel/50 p-4">
              <h4 className="text-sm font-medium text-text-muted mb-2">Participants</h4>
              <p className="text-lg font-semibold text-text-main">{t.participant_count}/{t.max_participants}</p>
            </div>
            <div className="theme-panel-shell rounded-xl border bg-panel/50 p-4">
              <h4 className="text-sm font-medium text-text-muted mb-2">Prize Pool</h4>
              <p className="text-lg font-semibold text-text-main flex items-center gap-1">
                {t.prize_pool_nectar > 0 && (
                  <>
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    {t.prize_pool_nectar.toLocaleString()} Nectar
                  </>
                )}
                {t.prize_pool_nectar === 0 && <span className="text-text-muted">No prize pool</span>}
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div className="theme-panel-shell rounded-xl border bg-panel/50 p-4">
            <h4 className="text-sm font-medium text-text-muted mb-3">Schedule</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Starts</p>
                <p className="font-medium text-text-main">{formatDate(t.starts_at)}</p>
              </div>
              <div>
                <p className="text-text-muted">Registration Closes</p>
                <p className="font-medium text-text-main">{formatDate(t.registration_closes_at)}</p>
              </div>
              {t.check_in_starts_at && (
                <div>
                  <p className="text-text-muted">Check-In Opens</p>
                  <p className="font-medium text-text-main">{formatDate(t.check_in_starts_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {canRegister && (
              <button
                onClick={() => onRegister(t.id)}
                className="flex-1 min-w-[150px] px-4 py-3 bg-primary text-app rounded-xl font-semibold hover:opacity-90 transition-colors"
              >
                Register
              </button>
            )}
            {canCheckIn && (
              <button
                onClick={() => onCheckIn(t.id)}
                className="flex-1 min-w-[150px] px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-colors"
              >
                Check In
              </button>
            )}
            {canStart && (
              <button
                onClick={() => onStart(t.id)}
                className="flex-1 min-w-[150px] px-4 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Tournament
              </button>
            )}
            {isRegistered && !canRegister && !canCheckIn && (
              <span className="flex-1 min-w-[150px] px-4 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Registered
              </span>
            )}
          </div>

          {/* Bracket Preview */}
          {matches.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-3">Matches</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {matches.slice(0, 10).map(match => (
                  <div key={match.id} className="theme-panel-shell rounded-lg border bg-panel/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-main">
                        Round {match.round_number} - Match {match.match_number}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        match.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                        match.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {match.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-sm">
                      <span className="text-text-main">{match.player1_username || 'TBD'}</span>
                      <span className="text-text-muted">vs</span>
                      <span className="text-text-main">{match.player2_username || 'TBD'}</span>
                      {match.winner_username && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                          Winner: {match.winner_username}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {matches.length > 10 && (
                  <p className="text-center text-sm text-text-muted py-2">+ {matches.length - 10} more matches...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Tournament Form
interface CreateTournamentFormProps {
  onCreate: (params: any) => Promise<string | null>;
  onCancel: () => void;
}

const CreateTournamentForm: React.FC<CreateTournamentFormProps> = ({ onCreate, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    season_id: "2026-s1",
    mode: "competitive",
    format: "single_elimination",
    max_participants: 64,
    min_rating: 0,
    max_rating: "",
    entry_fee_nectar: 0,
    prize_pool_nectar: 0,
    starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    registration_closes_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const id = await onCreate({
      ...formData,
      max_rating: formData.max_rating ? parseInt(formData.max_rating) : null,
    });

    if (id) {
      onCancel();
    } else {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main">Create Tournament</h2>
          <button
            onClick={onCancel}
            className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Tournament Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Weekend Warrior Championship"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Mode *</label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="genius">Genius</option>
                <option value="competitive">Competitive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Format</label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="swiss">Swiss System</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Max Participants</label>
              <input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                min="2" max="128"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Min Rating</label>
              <input
                type="number"
                value={formData.min_rating}
                onChange={(e) => setFormData({ ...formData, min_rating: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Max Rating (optional)</label>
              <input
                type="number"
                value={formData.max_rating}
                onChange={(e) => setFormData({ ...formData, max_rating: e.target.value })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="No cap"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Entry Fee (Nectar)</label>
              <input
                type="number"
                value={formData.entry_fee_nectar}
                onChange={(e) => setFormData({ ...formData, entry_fee_nectar: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Prize Pool (Nectar)</label>
            <input
              type="number"
              value={formData.prize_pool_nectar}
              onChange={(e) => setFormData({ ...formData, prize_pool_nectar: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Tournament Starts *</label>
              <input
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Registration Closes *</label>
              <input
                type="datetime-local"
                value={formData.registration_closes_at}
                onChange={(e) => setFormData({ ...formData, registration_closes_at: e.target.value })}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-border text-text-main rounded-xl font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-3 bg-primary text-app rounded-xl font-semibold hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  Create Tournament
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Tourneys;