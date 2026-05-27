import { createContext, useState, useEffect, useCallback } from "react";
import { DEF_MEMBERS, DEF_DEALS } from "../constants/defaultData.js";
import { LS_KEYS } from "../constants/index.js";
import { lsGet, lsSet, authLoad, authSave, authClear, nextId, parseAmt, resolvePhase, normalizeName } from "../utils/index.js";

export const AppContext = createContext(null);

/* 当月 period 文字列 ("YYYY-MM") */
const _NOW = new Date();
const _PAD = (n) => String(n).padStart(2, '0');
export const TODAY_PERIOD = `${_NOW.getFullYear()}-${_PAD(_NOW.getMonth() + 1)}`;

const _TODAY_ISO = new Date().toISOString();

/** confidence → yomi デフォルト変換 */
const _confToYomi = (c) => {
  if (c === "回収") return "受注";
  if (c === "70%")  return "70%";
  if (c === "50%")  return "50%";
  if (c === "30%")  return "30%";
  return "50%";
};

/** 旧ヨミ度ラベル（Aヨミ/Bヨミ/Cヨミ）を新しい%表記に移行 */
const _migrateYomi = (y) => {
  if (y === "Aヨミ") return "70%";
  if (y === "Bヨミ") return "50%";
  if (y === "Cヨミ") return "30%";
  return y;
};

/** フェーズの①②番号付き旧表記 → 番号なし新表記に移行 */
const _PHASE_MAP = {
  "①2nd": "2nd", "②デモ": "デモ", "③上長共有": "上長共有",
  "④決済者商談予定": "決済者商談予定", "⑤決済者共有": "決済者共有",
  "⑥稟議中": "稟議中", "⑦受注": "受注", "⑧失注": "失注",
};
const _migratePhase = (p) => _PHASE_MAP[p] ?? p;

const resolveYomi = (yomi, conf) => yomi || _confToYomi(conf);

/* デフォルト旗印 = なし（空データURI）
 * カスタム未設定時はファビコン非表示・ロゴ非表示 */
const DEFAULT_FAVICON_HREF = "data:,";

export const AppProvider = ({ children }) => {
  /* ── 認証 ── */
  const [currentUserId, setCurrentUserId] = useState(() => authLoad());

  /* ── マスタデータ（LS読み込み時に名前を自動マイグレーション） ── */
  const [members, setMembers] = useState(() => {
    const stored = lsGet(LS_KEYS.MEMBERS, DEF_MEMBERS);
    /* 旧ニックネーム → 正式名 に自動変換 */
    let result = stored.map(m => ({ ...m, name: normalizeName(m.name) }));
    /* 杉山さんのチームを "全社FS" → "杉山T" に修正（一回限り） */
    const SUGIYAMA_TEAM_FIX = "honnoji_sugiyama_team_v1";
    if (!localStorage.getItem(SUGIYAMA_TEAM_FIX)) {
      result = result.map(m =>
        m.name === "杉山" && m.team === "全社FS"
          ? { ...m, team: "杉山T", role: "leader", badge: "IS+FS" }
          : m
      );
      localStorage.setItem(SUGIYAMA_TEAM_FIX, "1");
    }
    /* 一回限りパスワードリセット: 全員「1111」に統一 */
    const PW_RESET_KEY = "honnoji_pw_reset_v1";
    if (!localStorage.getItem(PW_RESET_KEY)) {
      result = result.map(m => ({ ...m, pw: "1111" }));
      localStorage.setItem(PW_RESET_KEY, "1");
    }
    return result;
  });
  /* ── 通知ログ ── */
  const [notifLogs, setNotifLogs] = useState(() => lsGet(LS_KEYS.NOTIFS, []));
  useEffect(() => { lsSet(LS_KEYS.NOTIFS, notifLogs); }, [notifLogs]);

  const addNotifLog = useCallback((log) => {
    const entry = { id: `nlog_${Date.now()}`, isRead: false, createdAt: new Date().toISOString(), ...log };
    setNotifLogs(prev => [entry, ...prev].slice(0, 100)); // 最大100件
    return entry;
  }, []);
  const markNotifRead = useCallback((id) => {
    setNotifLogs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);
  const markAllNotifsRead = useCallback(() => {
    setNotifLogs(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);
  const clearNotifLogs = useCallback(() => setNotifLogs([]), []);

  /* ── タスク ── */
  const [tasks, setTasks] = useState(() => lsGet(LS_KEYS.TASKS, []));
  useEffect(() => { lsSet(LS_KEYS.TASKS, tasks); }, [tasks]);

  const addTask = useCallback((raw) => {
    const t = { ...raw, id: `task_${Date.now()}`, completed: false, createdAt: new Date().toISOString() };
    setTasks(prev => [t, ...prev]);
  }, []);
  const updateTask = useCallback((id, patch) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);
  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);
  const toggleTask = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id !== id ? t : {
      ...t,
      completed: !t.completed,
      completedAt: !t.completed ? new Date().toISOString() : null,
    }));
  }, []);

  const [deals, setDeals] = useState(() => {
    const stored = lsGet(LS_KEYS.DEALS, DEF_DEALS);
    /* 案件の IS/FS 担当名も正規化 */
    return stored.map(d => ({
      ...d,
      is:    normalizeName(d.is),
      fs:    normalizeName(d.fs),
      phase: _migratePhase(d.phase || "未設定"),
      period: d.period || TODAY_PERIOD,
      yomi:       _migrateYomi(d.yomi || _confToYomi(d.confidence)),
      lossReason: d.lossReason || "",
      createdAt:  d.createdAt  || _TODAY_ISO,
      updatedAt:  d.updatedAt  || _TODAY_ISO,
      activities: Array.isArray(d.activities) ? d.activities : [],
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

  /* ── 年月選択 ── */
  const [currentYear,  setCurrentYear]  = useState(_NOW.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(_NOW.getMonth() + 1);
  const [periodType,   setPeriodType]   = useState("month"); // "month"|"Q1"|"Q2"|"Q3"|"Q4"

  const currentPeriod = `${currentYear}-${_PAD(currentMonth)}`;
  const _QM = { Q1:[1,2,3], Q2:[4,5,6], Q3:[7,8,9], Q4:[10,11,12] };
  const activePeriods = periodType === "month"
    ? [currentPeriod]
    : (_QM[periodType] || []).map(m => `${currentYear}-${_PAD(m)}`);

  /* ── 要望データ ── */
  const [requests, setRequests] = useState(() => lsGet(LS_KEYS.REQUESTS, []));
  const [requestNotifs, setRequestNotifs] = useState([]); // ログイン時通知キュー

  /* ── UI状態 ── */
  const [activeTab,     setActiveTab]     = useState("マイ");
  const [activeView,    setActiveView]    = useState("summary");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [showNewDeal,   setShowNewDeal]   = useState(false);
  const [editingDeal,   setEditingDeal]   = useState(null);
  const [showPwPrompt,  setShowPwPrompt]  = useState(false);

  /* LocalStorage 同期 */
  useEffect(() => { lsSet(LS_KEYS.MEMBERS,  members);  }, [members]);
  useEffect(() => { lsSet(LS_KEYS.DEALS,    deals);    }, [deals]);
  useEffect(() => { lsSet(LS_KEYS.REQUESTS, requests); }, [requests]);

  /* ── 認証 ── */
  const login = useCallback((userId, pw) => {
    const m = members.find(m => m.id === userId && m.pw === pw && m.status === "active");
    if (!m) return false;
    authSave(m.id);
    setCurrentUserId(m.id);
    /* ログイン時は常に当月・月次・マイページにリセット */
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setPeriodType("month");
    setActiveTab("マイ");
    setActiveView("summary");
    /* 初期パスワード「1111」のままならパスワード変更を案内 */
    if (pw === "1111") setShowPwPrompt(true);
    /* 対応済み・未通知の要望を検出してキューに積む */
    const unnotified = lsGet(LS_KEYS.REQUESTS, []).filter(
      r => r.user === m.name && r.status === "対応済" && !r.notified
    );
    if (unnotified.length > 0) setRequestNotifs(unnotified);
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
      period: raw.period || currentPeriod,
      yomi:       resolveYomi(raw.yomi, raw.confidence),
      lossReason: raw.lossReason || "",
      createdAt:  raw.createdAt  || new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      activities: raw.activities || [],
    };
    setDeals(prev => [deal, ...prev]);
    return deal;
  }, [currentPeriod]);

  const updateDeal = useCallback((id, patch) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, ...patch, amount: patch.amount !== undefined ? parseAmt(patch.amount) : d.amount };
      next.phase = resolvePhase(next.confidence, next.phase);
      next.is = normalizeName(next.is);
      next.fs = normalizeName(next.fs);
      next.updatedAt = new Date().toISOString();
      return next;
    }));
  }, []);

  const deleteDeal = useCallback((id) => {
    setDeals(prev => prev.filter(d => d.id !== id));
  }, []);

  const addActivity = useCallback((dealId, act) => {
    const now = new Date().toISOString();
    /* act.date が渡された場合はそれを優先、なければ現在時刻 */
    setDeals(prev => prev.map(d => d.id !== dealId ? d : {
      ...d,
      activities: [...(d.activities || []), { id: nextId(), date: now, ...act }],
      updatedAt: now,
    }));
  }, []);

  const deleteActivity = useCallback((dealId, actId) => {
    const now = new Date().toISOString();
    setDeals(prev => prev.map(d => d.id !== dealId ? d : {
      ...d,
      activities: (d.activities || []).filter(a => a.id !== actId),
      updatedAt: now,
    }));
  }, []);

  const updateActivity = useCallback((dealId, actId, patch) => {
    const now = new Date().toISOString();
    setDeals(prev => prev.map(d => d.id !== dealId ? d : {
      ...d,
      activities: (d.activities || []).map(a => a.id !== actId ? a : { ...a, ...patch }),
      updatedAt: now,
    }));
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

  /* ── 要望 CRUD ── */
  const addRequest = useCallback((content, requester) => {
    const req = {
      id:        `req_${Date.now()}`,
      user:      requester || currentUser?.name || "",
      content,
      status:    "未対応",
      notified:  false,
      likes:     [],
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => [req, ...prev]);
  }, [currentUser]);

  const resolveRequest = useCallback((id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "対応済" } : r));
  }, []);

  const toggleLike = useCallback((id) => {
    const name = currentUser?.name;
    if (!name) return;
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      const likes = r.likes ?? [];
      return { ...r, likes: likes.includes(name) ? likes.filter(n => n !== name) : [...likes, name] };
    }));
  }, [currentUser]);

  const deleteRequest = useCallback((id) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  const markRequestNotified = useCallback((id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, notified: true } : r));
    setRequestNotifs(prev => prev.filter(r => r.id !== id));
  }, []);

  const dismissAllNotifs = useCallback(() => {
    const ids = requestNotifs.map(r => r.id);
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, notified: true } : r));
    setRequestNotifs([]);
  }, [requestNotifs]);

  return (
    <AppContext.Provider value={{
      /* auth */
      currentUserId, currentUser, login, loginByName, logout,
      /* data */
      members, deals, tasks,
      addTask, updateTask, deleteTask, toggleTask,
      /* notifLogs */
      notifLogs, addNotifLog, markNotifRead, markAllNotifsRead, clearNotifLogs,
      addDeal, updateDeal, deleteDeal, addActivity, deleteActivity, updateActivity,
      updateMember, addMember, deleteMember,
      replaceDeals, replaceMembers,
      /* requests */
      requests, addRequest, resolveRequest, toggleLike, deleteRequest,
      markRequestNotified, requestNotifs, dismissAllNotifs,
      /* logo */
      logoDataUrl, saveLogo,
      /* pw prompt */
      showPwPrompt, setShowPwPrompt,
      /* period */
      currentYear, setCurrentYear,
      currentMonth, setCurrentMonth,
      periodType, setPeriodType,
      currentPeriod, activePeriods,
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
