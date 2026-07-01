/**
 * DailyRewardContext.jsx
 * Global context that:
 *  - Checks if a daily reward is available on login
 *  - Exposes state to open/close the modal anywhere in the app
 *  - Handles claiming and profile refresh after claim
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getDailyRewardStatus, claimDailyReward } from '../dailyReward';

const DailyRewardContext = createContext(null);

export function DailyRewardProvider({ children }) {
  const { user, refreshProfile } = useAuth();

  const [rewardInfo, setRewardInfo]         = useState(null);   // status from RPC
  const [rewardAvailable, setRewardAvailable] = useState(false); // unclaimed today
  const [modalOpen, setModalOpen]           = useState(false);
  const [claimedResult, setClaimedResult]   = useState(null);   // result after claim

  // ── Check reward status whenever the user changes (login / refresh) ────
  const checkReward = useCallback(async () => {
    if (!user) {
      setRewardInfo(null);
      setRewardAvailable(false);
      return;
    }
    try {
      const status = await getDailyRewardStatus(user.id);
      if (!status || status.error) return;
      setRewardInfo(status);
      if (status.available) {
        setRewardAvailable(true);
        // Auto-open popup on first login of the day
        setModalOpen(true);
      } else {
        setRewardAvailable(false);
      }
    } catch (err) {
      console.error('Daily reward check error:', err);
    }
  }, [user?.id]); // eslint-disable-line

  useEffect(() => {
    // Small delay so auth + profile are fully settled first
    const t = setTimeout(checkReward, 800);
    return () => clearTimeout(t);
  }, [checkReward]);

  // ── Claim handler (called from DailyRewardModal) ───────────────────────
  const handleClaim = useCallback(async () => {
    if (!user) return;
    const result = await claimDailyReward(user.id);
    if (result.error) throw new Error(result.error);
    setClaimedResult(result);
    setRewardAvailable(false);
    // Merge claimed data back into rewardInfo so the modal shows the right values
    setRewardInfo(prev => ({
      ...prev,
      ...result,
      available: false,
    }));
    // Refresh profile so XP bar and streak update everywhere
    await refreshProfile();
    return result;
  }, [user?.id, refreshProfile]); // eslint-disable-line

  const openModal  = useCallback(() => setModalOpen(true),  []);
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setClaimedResult(null);
  }, []);

  return (
    <DailyRewardContext.Provider value={{
      rewardInfo,
      rewardAvailable,
      modalOpen,
      claimedResult,
      openModal,
      closeModal,
      handleClaim,
    }}>
      {children}
    </DailyRewardContext.Provider>
  );
}

export function useDailyReward() {
  const ctx = useContext(DailyRewardContext);
  if (!ctx) throw new Error('useDailyReward must be inside <DailyRewardProvider>');
  return ctx;
}
