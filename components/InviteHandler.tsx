import React, { useEffect, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useFriendInvites, FriendInvite } from "@/hooks/useFriendInvites";
import { InviteModal } from "@/components/friends/InviteModal";
import { AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";

/**
 * InviteHandler - Handles deep links for friend invites
 *
 * When a user visits the app with `?invite=CODE` in the URL:
 * - If logged in: auto-accept the invite and show confirmation
 * - If not logged in: store the code and prompt to login first, then accept
 */
export function InviteHandler() {
  const { user, userData, loading: authLoading } = useAuth();
  const { acceptInvite, pendingInvites, refresh: refetchInvites } = useFriendInvites();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptResult, setAcceptResult] = useState<{ success: boolean; username?: string; error?: string } | null>(null);
  const [hasCheckedForInvite, setHasCheckedForInvite] = useState(false);

  // Check for invite code in URL on mount and when location changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("invite");

    if (code && !hasCheckedForInvite) {
      setInviteCode(code.toUpperCase());
      setHasCheckedForInvite(true);
    }
  }, [location.search, hasCheckedForInvite]);

  // Handle invite acceptance when user becomes authenticated
  useEffect(() => {
    if (!authLoading && user && inviteCode && !acceptResult) {
      handleAcceptInvite();
    }
  }, [authLoading, user, inviteCode, acceptResult]);

  // If invite code exists but user not logged in, redirect to auth with invite preserved
  useEffect(() => {
    if (!authLoading && !user && inviteCode) {
      // Store invite code in sessionStorage for after login
      sessionStorage.setItem("pending_invite_code", inviteCode);
      // The auth page will handle the redirect back
    }
  }, [authLoading, user, inviteCode]);

  const handleAcceptInvite = useCallback(async () => {
    if (!inviteCode || !user) return;

    setAccepting(true);
    setAcceptResult(null);

    try {
      const result = await acceptInvite(inviteCode);
      setAcceptResult({ success: true, username: result.friend_username });
      // Clear the invite code from URL
      navigate(location.pathname, { replace: true });
      // Refetch pending invites to update UI
      await refetchInvites();
    } catch (err: any) {
      console.error("Failed to accept invite:", err);
      setAcceptResult({ success: false, error: err.message || "Failed to accept invite" });
    } finally {
      setAccepting(false);
    }
  }, [inviteCode, user, acceptInvite, navigate, location.pathname, refetchInvites]);

  const handleCloseModal = useCallback(() => {
    setShowAcceptModal(false);
    setInviteCode(null);
    setAcceptResult(null);
    // Clean up URL
    if (location.search.includes("invite=")) {
      navigate(location.pathname, { replace: true });
    }
  }, [navigate, location.pathname, location.search]);

  // Show modal when we have an invite code and user is logged in
  useEffect(() => {
    if (inviteCode && user && !authLoading) {
      setShowAcceptModal(true);
    }
  }, [inviteCode, user, authLoading]);

  if (authLoading) return null;

  return (
    <>
      {/* Accept Invite Modal */}
      <InviteAcceptModal
        isOpen={showAcceptModal}
        onClose={handleCloseModal}
        inviteCode={inviteCode}
        accepting={accepting}
        acceptResult={acceptResult}
        onAccept={handleAcceptInvite}
        onRetry={() => {
          setAcceptResult(null);
          handleAcceptInvite();
        }}
      />

      {/* If not logged in but has invite, show banner prompting login */}
      {!user && inviteCode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600/95 backdrop-blur-sm text-white text-center py-3 px-4 animate-slide-down">
          <div className="flex items-center justify-center gap-3 max-w-2xl mx-auto">
            <div className="flex-1 text-left">
              <span className="font-medium">You've been invited to play HiveSpell!</span>
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm font-mono">{inviteCode}</span>
            </div>
            <button
              onClick={() => {
                sessionStorage.setItem("pending_invite_code", inviteCode);
                navigate("/auth");
              }}
              className="px-4 py-2 bg-white text-amber-600 font-semibold rounded-lg hover:bg-white/90 transition-colors"
            >
              Log In to Accept
            </button>
            <button
              onClick={() => {
                setInviteCode(null);
                navigate(location.pathname, { replace: true });
              }}
              className="p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface InviteAcceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string | null;
  accepting: boolean;
  acceptResult: { success: boolean; username?: string; error?: string } | null;
  onAccept: () => void;
  onRetry: () => void;
}

function InviteAcceptModal({
  isOpen,
  onClose,
  inviteCode,
  accepting,
  acceptResult,
  onAccept,
  onRetry,
}: InviteAcceptModalProps) {
  if (!isOpen || !inviteCode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Friend Invite
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {acceptResult ? (
            // Result state
            acceptResult.success ? (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Invite Accepted!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You are now friends with <span className="font-medium text-primary">{acceptResult.username}</span>.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  You can now see their presence, join their games, or spectate them from the lobby.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Couldn't Accept Invite
                </h3>
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {acceptResult.error}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onRetry}
                    className="flex-1 py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-6 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )
          ) : (
            // Pending/Confirmation state
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                  {accepting ? "Accepting..." : "Accept Invite?"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {accepting
                    ? "Joining your friend's network..."
                    : `Invite code: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{inviteCode}</code>`}
                </p>
              </div>

              {!accepting && (
                <div className="flex gap-2">
                  <button
                    onClick={onAccept}
                    className="flex-1 py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-6 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}

              {accepting && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing invite...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component to handle pending invite from sessionStorage after login
 */
export function PendingInviteHandler() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptInvite, refresh: refetchInvites } = useFriendInvites();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (user && !handled) {
      const pendingCode = sessionStorage.getItem("pending_invite_code");
      if (pendingCode) {
        sessionStorage.removeItem("pending_invite_code");

        acceptInvite(pendingCode.toUpperCase())
          .then(() => {
            refetchInvites();
            // Could show a toast here
          })
          .catch((err) => {
            console.error("Failed to accept pending invite:", err);
          });
      }
      setHandled(true);
    }
  }, [user, handled, acceptInvite, refetchInvites, navigate]);

  return null;
}

export default InviteHandler;