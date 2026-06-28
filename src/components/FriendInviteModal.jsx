/**
 * FriendInviteModal.jsx — Realtime popup for incoming party invites.
 * Appears as an overlay toast; auto-dismisses when invite expires.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocial } from '../contexts/SocialContext';
import { respondToInvite } from '../socialApi';
import { supabase } from '../supabase';

export default function FriendInviteModal() {
  const { pendingInvite, dismissInvite } = useSocial();
  const navigate = useNavigate();
  const [senderName, setSenderName] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    if (!pendingInvite) { setTimeLeft(120); return; }

    // Fetch sender name
    supabase
      .from('profiles')
      .select('username')
      .eq('id', pendingInvite.sender_id)
      .single()
      .then(({ data }) => setSenderName(data?.username || 'A friend'));

    // Compute time left from expires_at
    const expiresAt = new Date(pendingInvite.expires_at).getTime();
    const updateTimer = () => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) dismissInvite();
    };
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [pendingInvite?.id]); // eslint-disable-line

  if (!pendingInvite) return null;

  async function handleAccept() {
    await respondToInvite(pendingInvite.id, true);
    dismissInvite();
    navigate(`/lobby/${pendingInvite.room_id}`);
  }

  async function handleDecline() {
    await respondToInvite(pendingInvite.id, false);
    dismissInvite();
  }

  return (
    <div className="invite-modal-overlay" onClick={handleDecline}>
      <div className="invite-modal" onClick={e => e.stopPropagation()}>
        <div className="invite-modal-icon">🎮</div>
        <div className="invite-modal-body">
          <p className="invite-modal-title">Party Invitation!</p>
          <p className="invite-modal-sub">
            <strong>{senderName}</strong> invited you to a party
            {pendingInvite.room_code && (
              <> · Code: <strong>{pendingInvite.room_code}</strong></>
            )}
          </p>
          <div className="invite-modal-timer">Expires in {timeLeft}s</div>
        </div>
        <div className="invite-modal-actions">
          <button className="btn btn-primary invite-accept-btn" onClick={handleAccept}>
            ✓ Accept
          </button>
          <button className="btn btn-ghost invite-decline-btn" onClick={handleDecline}>
            ✕ Decline
          </button>
        </div>
      </div>
    </div>
  );
}
