import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { supabase } from '../../lib/supabase';

const STORAGE_KEY = 'resq_ingredient_avoid_list';
const SYNC_PREF_KEY = 'resq_ingredient_sync_pref';

const SUGGESTED_ITEMS = [
  'Milk',
  'Peanuts',
  'Tree nuts',
  'Eggs',
  'Soy',
  'Wheat / gluten',
  'Sesame',
  'Fragrance / parfum',
  'Fluoride',
  'Sodium lauryl sulfate (SLS)'
];

const CATEGORIES = [
  { id: 'Allergy', label: 'Allergy', colorClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold' },
  { id: 'Sensitivity', label: 'Sensitivity', colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold' },
  { id: 'Personal preference', label: 'Personal preference', colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold' }
];

export default function AvoidListManager() {
  const { t } = useI18n();

  const [avoidList, setAvoidList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [
      { id: '1', name: 'Peanuts', category: 'Allergy' },
      { id: '2', name: 'Sodium lauryl sulfate (SLS)', category: 'Sensitivity' }
    ];
  });

  const [syncPref, setSyncPref] = useState(() => localStorage.getItem(SYNC_PREF_KEY) || 'local');
  const [userSession, setUserSession] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [customName, setCustomName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Allergy');
  const [errorMsg, setErrorMsg] = useState(null);

  // Check Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial from cloud if opted in
  useEffect(() => {
    if (syncPref === 'cloud' && userSession?.user?.id) {
      const loadFromCloud = async () => {
        setIsSyncing(true);
        try {
          const { data, error } = await supabase
            .from('ingredient_avoid_profiles')
            .select('avoid_items')
            .eq('user_id', userSession.user.id)
            .single();
          
          if (!error && data?.avoid_items) {
            setAvoidList(data.avoid_items);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.avoid_items));
          }
        } catch (e) {
          console.error("Failed to load synced avoid list", e);
        } finally {
          setIsSyncing(false);
        }
      };
      loadFromCloud();
    }
  }, [syncPref, userSession]);

  // Persist to localStorage and sync to Supabase whenever avoidList changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(avoidList));
      if (syncPref === 'cloud' && userSession?.user?.id && !isSyncing) {
        supabase.from('ingredient_avoid_profiles')
          .upsert({ user_id: userSession.user.id, avoid_items: avoidList, updated_at: new Date().toISOString() })
          .then(({error}) => { if (error) console.error("Sync error:", error) });
      }
    } catch (err) {
      console.error('Failed to save avoid list', err);
    }
  }, [avoidList, syncPref, userSession, isSyncing]);

  const handleEnableSync = async () => {
    if (!userSession) {
      setErrorMsg(t("You must be logged in to sync data."));
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    setSyncPref('cloud');
    localStorage.setItem(SYNC_PREF_KEY, 'cloud');
    setIsSyncing(true);
    try {
      await supabase.from('ingredient_avoid_profiles').upsert({
        user_id: userSession.user.id,
        avoid_items: avoidList,
        updated_at: new Date().toISOString()
      });
    } catch(e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisableSync = async () => {
    if (userSession?.user?.id) {
      try {
        await supabase.from('ingredient_avoid_profiles').delete().eq('user_id', userSession.user.id);
      } catch (e) {
        console.error(e);
      }
    }
    setSyncPref('local');
    localStorage.setItem(SYNC_PREF_KEY, 'local');
  };

  const handleAddItem = (itemName, category = selectedCategory) => {
    const trimmed = itemName.trim();
    if (!trimmed) return;

    if (avoidList.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(t(`"${trimmed}" is already on your avoid list.`));
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setErrorMsg(null);
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: trimmed,
      category
    };

    setAvoidList((prev) => [newItem, ...prev]);
    setCustomName('');
  };

  const handleRemoveItem = (id) => {
    setAvoidList((prev) => prev.filter((item) => item.id !== id));
  };

  const getCategoryBadge = (category) => {
    const found = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${found.colorClass}`}>
        {t(found.label)}
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">do_not_disturb_on</span>
            {t("My Avoid List")}
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t("Specify ingredients, additives, or allergens you wish to avoid.")}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap text-center">
          {avoidList.length} {t("items active")}
        </span>
      </div>

      {/* Sync Control */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-3">
        <div className="flex items-start gap-2 text-on-surface">
          <span className="material-symbols-outlined text-primary mt-0.5">cloud_sync</span>
          <div className="space-y-1">
            <h3 className="text-sm font-bold">{t("Sync Avoid List")}</h3>
            <p className="text-xs text-on-surface-variant">
              {t("Avoid List data may be health-related. Sync is optional and can be deleted at any time.")}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {syncPref === 'local' ? (
            <>
              <button disabled className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary">
                {t("Keep on this device")}
              </button>
              <button 
                onClick={handleEnableSync}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-container text-on-surface border border-outline-variant hover:border-primary transition-colors"
              >
                {t("Sync to my ResQ+ account")}
              </button>
            </>
          ) : (
            <>
              <button disabled className="px-4 py-2 rounded-xl text-xs font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">cloud_done</span>
                {t("Synced to ResQ+ account")}
              </button>
              <button 
                onClick={handleDisableSync}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-container text-red-600 dark:text-red-400 border border-outline-variant hover:border-red-500 hover:bg-red-500/10 transition-colors"
              >
                {t("Stop Syncing & Delete Cloud Data")}
              </button>
            </>
          )}
        </div>
        {isSyncing && <p className="text-[10px] text-primary italic font-bold">{t("Syncing...")}</p>}
      </div>

      {/* Suggested Quick Add Chips */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">
          {t("Quick Add Suggestions")}
        </label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_ITEMS.map((suggested) => {
            const isAdded = avoidList.some((item) => item.name.toLowerCase() === suggested.toLowerCase());
            return (
              <button
                key={suggested}
                onClick={() => !isAdded && handleAddItem(suggested, 'Allergy')}
                disabled={isAdded}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                  isAdded
                    ? 'bg-surface-container-low text-on-surface-variant/50 border-outline-variant/40 cursor-not-allowed line-through'
                    : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-primary/60 hover:text-primary active:scale-[0.97]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{isAdded ? 'check' : 'add'}</span>
                {suggested}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Item Form */}
      <div className="space-y-3 pt-2 border-t border-outline-variant/40">
        <label className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">
          {t("Add Custom Avoid Item")}
        </label>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddItem(customName);
          }}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3"
        >
          <div className="sm:col-span-6">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t("e.g., Palm oil, Artificial Red 40, Lactose")}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface focus:border-primary focus:outline-none transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {t(cat.label)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!customName.trim()}
              className="w-full h-full py-2.5 px-3 rounded-xl font-bold text-xs bg-primary text-on-primary shadow-sm hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              {t("Add")}
            </button>
          </div>
        </form>
      </div>

      {/* Active Avoid List Items */}
      <div className="space-y-3 pt-2 border-t border-outline-variant/40">
        <label className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">
          {t("Your Configured Avoid List")}
        </label>

        {avoidList.length === 0 ? (
          <div className="p-6 rounded-xl bg-surface-container-low border border-dashed border-outline-variant text-center space-y-1">
            <p className="text-xs font-bold text-on-surface">{t("No ingredients currently added.")}</p>
            <p className="text-[11px] text-on-surface-variant">
              {t("Use the quick add suggestions above or enter custom items.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {avoidList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 hover:border-outline-variant transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-on-surface truncate">{item.name}</p>
                  {getCategoryBadge(item.category)}
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1.5 rounded-lg text-on-surface-variant/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title={t("Remove item")}
                  aria-label={t("Remove item")}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
