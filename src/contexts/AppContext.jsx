import { createContext, useState, useEffect, useCallback } from "react";
import { DEF_MEMBERS, DEF_DEALS } from "../constants/defaultData.js";
import { LS_KEYS } from "../constants/index.js";
import { lsGet, lsSet, authLoad, authSave, authClear, nextId, parseAmt, resolvePhase } from "../utils/index.js";

export const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  /* ── 認証 ── */
  const [currentUserId, setCurrentUserId] = useState(() => authLoad());

  /* ── マスタデータ ── */
  const [members, setMembers] = useState(() => lsGet(LS_KEYS.MEMBERS, DEF_MEMBERS));
  const [deals,   setDeals]   = useState(() => lsGet(LS_KEYS.DEALS,   DEF_DEALS));

  /* ── UI状態 ── */
  const [activeTab,    setActiveTab]    = useState("全体");
  const [activeView,   setActiveView]   = useState("summary"); // summary | list | kanban | personal | settings
  const [searchQuery,  setSearchQuery]  = useState("");
  const [showNewDeal,  setShowNewDeal]  = useState(false);
  const [editingDeal,  setEditingDeal]  = useState(null); // null | deal object

  /* LocalStorage 同期 */
  useEffect(() => { lsSet(LS_KEYS.MEMBERS, members); }, [members]);
  useEffect(() => { lsSet(LS_KEYS.DEALS,   deals);   }, [deals]);

  /* ── 認証 ── */
  const login = useCallback((userId, pw) => {
    const m = members.find(m => m.id === userId && m.pw === pw && m.status === "active");
    if (!m) return false;
    authSave(m.id);
    setCurrentUserId(m.id);
    return true;
  }, [members]);

  const loginByName = useCallback((name, pw) => {
    const m = members.find(m => m.name === name && m.pw === pw && m.status === "active");
    if (!m) return false;
    authSave(m.id);
    setCurrentUserId(m.id);
    return true;
  }, [members]);

  const logout = useCallback(() => {
    authClear();
    setCurrentUserId(null);
  }, []);

  const currentUser = members.find(m => m.id === currentUserId) ?? null;

  /* ── 案件 CRUD ── */
  const addDeal = useCallback((raw) => {
    const deal = {
      ...raw,
      id:     nextId(),
      amount: parseAmt(raw.amount),
      phase:  resolvePhase(raw.confidence, raw.phase),
    };
    setDeals(prev => [deal, ...prev]);
    return deal;
  }, []);

  const updateDeal = useCallback((id, patch) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, ...patch, amount: patch.amount !== undefined ? parseAmt(patch.amount) : d.amount };
      next.phase = resolvePhase(next.confidence, next.phase);
      return next;
    }));
  }, []);

  const deleteDeal = useCallback((id) => {
    setDeals(prev => prev.filter(d => d.id !== id));
  }, []);

  /* ── メンバー CRUD ── */
  const updateMember = useCallback((id, patch) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const addMember = useCallback((raw) => {
    const m = { ...raw, id: `usr_${Date.now()}`, status: "active" };
    setMembers(prev => [...prev, m]);
    return m;
  }, []);

  const deleteMember = useCallback((id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  /* インポート用: 全データ一括置換 */
  const replaceDeals   = useCallback((ds) => setDeals(ds),   []);
  const replaceMembers = useCallback((ms) => setMembers(ms), []);

  return (
    <AppContext.Provider value={{
      /* auth */
      currentUserId, currentUser, login, loginByName, logout,
      /* data */
      members, deals,
      addDeal, updateDeal, deleteDeal,
      updateMember, addMember, deleteMember,
      replaceDeals, replaceMembers,
      /* ui */
      activeTab, setActiveTab,
      activeView, setActiveView,
      searchQuery, setSearchQuery,
      showNewDeal, setShowNewDeal,
      editingDeal, setEditingDeal,
    }}>
      {children}
    </AppContext.Provider>
  );
};

/* useApp は contexts/useApp.js からインポートしてください */
