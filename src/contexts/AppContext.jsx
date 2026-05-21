import { createContext, useState, useEffect, useCallback } from "react";
import { DEF_MEMBERS, DEF_DEALS } from "../constants/defaultData.js";
import { LS_KEYS } from "../constants/index.js";
import { lsGet, lsSet, authLoad, authSave, authClear, nextId, parseAmt, resolvePhase, normalizeName } from "../utils/index.js";

export const AppContext = createContext(null);

/* デフォルト旗印（HONNOJIロゴSVG） — リセット時にファビコンを戻すために使用
 * viewBox="0 8 64 50" : 兜コンテンツに合わせて上下余白をカットし最大表示 */
const DEFAULT_FAVICON_HREF =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 8 64 50'%3E" +
  "%3Crect width='64' height='64' fill='%230070d2'/%3E" +
  "%3Cpath d='M27,14 C6,12 0,26 25,40' fill='none' stroke='white' stroke-width='7' stroke-linecap='round'/%3E" +
  "%3Cpath d='M37,14 C58,12 64,26 39,40' fill='none' stroke='white' stroke-width='7' stroke-linecap='round'/%3E" +
  "%3Cpath d='M16,36 C16,21 23,14 32,14 C41,14 48,21 48,36Z' fill='white'/%3E" +
  "%3Cellipse cx='32' cy='29' rx='9' ry='7' fill='%230070d2' opacity='.55'/%3E" +
  "%3Cpath d='M12,37 C12,50 20,54 32,54 C44,54 52,50 52,37Z' fill='white' opacity='.78'/%3E" +
  "%3C/svg%3E";

export const AppProvider = ({ children }) => {
  /* ── 認証 ── */
  const [currentUserId, setCurrentUserId] = useState(() => authLoad());

  /* ── マスタデータ（LS読み込み時に名前を自動マイグレーション） ── */
  const [members, setMembers] = useState(() => {
    const stored = lsGet(LS_KEYS.MEMBERS, DEF_MEMBERS);
    /* 旧ニックネーム → 正式名 に自動変換 */
    return stored.map(m => ({ ...m, name: normalizeName(m.name) }));
  });
  const [deals, setDeals] = useState(() => {
    const stored = lsGet(LS_KEYS.DEALS, DEF_DEALS);
    /* 案件の IS/FS 担当名も正規化 */
    return stored.map(d => ({
      ...d,
      is: normalizeName(d.is),
      fs: normalizeName(d.fs),
    }));
  });

  /* ── ロゴ（旗印）— LocalStorage から初期化し、全コンポーネントで共有 ── */
  const [logoDataUrl, setLogoDataUrl] = useState(
    () => localStorage.getItem("honnoji_favicon") || null
  );

  /** 旗印を保存・即時反映する。null を渡すとデフォルトに戻す */
  const saveLogo = useCallback((dataUrl) => {
    if (dataUrl) {
      localStorage.setItem("honnoji_favicon", dataUrl);
    } else {
      localStorage.removeItem("honnoji_favicon");
    }
    /* <link rel="icon"> をリアルタイムで書き換え */
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = dataUrl || DEFAULT_FAVICON_HREF;
    setLogoDataUrl(dataUrl || null);
  }, []);

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
      is:     normalizeName(raw.is),
      fs:     normalizeName(raw.fs),
    };
    setDeals(prev => [deal, ...prev]);
    return deal;
  }, []);

  const updateDeal = useCallback((id, patch) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, ...patch, amount: patch.amount !== undefined ? parseAmt(patch.amount) : d.amount };
      next.phase = resolvePhase(next.confidence, next.phase);
      next.is = normalizeName(next.is);
      next.fs = normalizeName(next.fs);
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
      /* logo */
      logoDataUrl, saveLogo,
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
