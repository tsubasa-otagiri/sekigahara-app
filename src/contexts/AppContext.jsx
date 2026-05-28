/**
 * AppContext.jsx
 *
 * 【API書き込みルール】
 *  - useEffect から apiSet を呼ぶことは絶対禁止（無限ループの原因）
 *  - apiSet はユーザー操作による各 mutation 関数の内部でのみ呼ぶ
 *  - ポーリング（fetchAllFromAPI）は GET 読み込み専用。書き込みしない
 *  - 起動時マイグレーション: localStorage.getItem が null でないときのみ移行
 */
import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { DEF_MEMBERS, DEF_DEALS } from "../constants/defaultData.js";
import { LS_KEYS } from "../constants/index.js";
import { lsGet, lsSet, authLoad, authSave, authClear, nextId, parseAmt, resolvePhase, normalizeName, normalizePeriod } from "../utils/index.js";
import { buildMonthlyTasks } from "../utils/monthlyTasks.js";
import { apiGet, apiSet, ForbiddenError } from "../utils/api.js";

/* 月末タスク対象メンバー（固定15名） */
const MONTHLY_MEMBERS = [
  "中村","中","櫻井","青木",
  "渡部","横井","上浦","太田",
  "鈴木","十文字","井上",
  "杉山","小田切","早川","早坂",
];

export const AppContext = createContext(null);

/**
 * 月末処理タスクのデフォルト定義
 * daysBefore: 最終営業日の何日前が締切か（0=当日, 正数=N日前）
 */
export const DEFAULT_PANEL_TASKS = [
  { id: "pt0", emoji: "📄", title: "前月・先々月受注の請求書リマインド", when: "最終営業日5日前",      daysBefore: 5 },
  { id: "pt1", emoji: "📝", title: "リモア登録",                        when: "最終営業日3日前",      daysBefore: 3 },
  { id: "pt2", emoji: "🚚", title: "今月回収案件の役務提供",             when: "最終営業日当日",       daysBefore: 0 },
  { id: "pt3", emoji: "💰", title: "先月・先々月の入金確認",             when: "最終営業日当日",       daysBefore: 0 },
  { id: "pt4", emoji: "💳", title: "経費精算",                          when: "最終営業日当日",       daysBefore: 0 },
  { id: "pt5", emoji: "⏰", title: "勤怠申請",                          when: "最終営業日 18:55締切", daysBefore: 0, isKintai: true },
];

/* 当月 period 文字列 ("YYYY-MM") */
const _NOW = new Date();
const _PAD = (n) => String(n).padStart(2, "0");
export const TODAY_PERIOD = `${_NOW.getFullYear()}-${_PAD(_NOW.getMonth() + 1)}`;
const _TODAY_ISO = new Date().toISOString();

const _confToYomi = (c) => {
  if (c === "回収") return "受注";
  if (c === "70%")  return "70%";
  if (c === "50%")  return "50%";
  if (c === "30%")  return "30%";
  return "50%";
};
const _migrateYomi = (y) => {
  if (y === "Aヨミ") return "70%";
  if (y === "Bヨミ") return "50%";
  if (y === "Cヨミ") return "30%";
  return y;
};
const _PHASE_MAP = {
  "①2nd": "2nd", "②デモ": "デモ", "③上長共有": "上長共有",
  "④決済者商談予定": "決済者商談予定", "⑤決済者共有": "決済者共有",
  "⑥稟議中": "稟議中", "⑦受注": "受注", "⑧失注": "失注",
};
const _migratePhase = (p) => _PHASE_MAP[p] ?? p;
const resolveYomi = (yomi, conf) => yomi || _confToYomi(conf);
const _normDeal = (d) => ({
  ...d,
  is:         normalizeName(d.is),
  fs:         normalizeName(d.fs),
  phase:      _migratePhase(d.phase || "未設定"),
  period:     normalizePeriod(d.period) || TODAY_PERIOD,
  yomi:       _migrateYomi(d.yomi || _confToYomi(d.confidence)),
  lossReason: d.lossReason || "",
  createdAt:  d.createdAt  || _TODAY_ISO,
  updatedAt:  d.updatedAt  || _TODAY_ISO,
  activities: Array.isArray(d.activities) ? d.activities : [],
});

const DEFAULT_FAVICON_HREF = "data:,";

/* ── ローカルストレージにキーが実在するか確認（デフォルト値と区別） ── */
const lsExists = (key) => localStorage.getItem(key) !== null;

export const AppProvider = ({ children }) => {

  /* ══════════════════════════════════════════════════════
   * API ロード完了フラグ
   * false の間は useEffect 内から apiSet を呼ばない（呼ばせない）
   * ══════════════════════════════════════════════════════ */
  const apiLoadedRef = useRef(false);

  /* ══════════════════════════════════════════════════════
   * ネットワーク遮断ステート
   *   networkBlocked : Workers が 403 を返した場合 true
   *                    → App.jsx でアプリ全体をブロック画面に切り替え
   *   apiChecking    : 初回 API チェック完了前は true
   *                    → 完了前に localStorage キャッシュを表示させない
   * ══════════════════════════════════════════════════════ */
  const [networkBlocked, setNetworkBlocked] = useState(false);
  const [apiChecking,    setApiChecking]    = useState(true);
  const [lastUpdatedAt,  setLastUpdatedAt]  = useState(null); // 最終更新日時

  /* ── ユーザー別通知設定 ── */
  const [userSettings, setUserSettings] = useState(() => {
    const raw = lsGet(LS_KEYS.USER_SETTINGS, {});
    const { __panelTasks: _, ...rest } = raw;
    return rest;
  });
  const userSettingsRef = useRef(userSettings);

  /* ── 月末処理タスク定義（全ユーザー共有） ── */
  const [panelTasks, setPanelTasksRaw] = useState(() => {
    const raw = lsGet(LS_KEYS.USER_SETTINGS, {});
    return Array.isArray(raw.__panelTasks) && raw.__panelTasks.length > 0
      ? raw.__panelTasks
      : DEFAULT_PANEL_TASKS;
  });
  const panelTasksRef = useRef(panelTasks);

  /* userSettings / panelTasks → localStorage のみ（API書き込みは各 setter 内で） */
  useEffect(() => {
    userSettingsRef.current = userSettings;
    panelTasksRef.current   = panelTasks;
    lsSet(LS_KEYS.USER_SETTINGS, { ...userSettings, __panelTasks: panelTasks });
  }, [userSettings, panelTasks]);

  const getMyNotifSettings = useCallback((userId) => {
    return { notifyOnTaskAdded: true, notifyOnTaskReminder: true, ...((userSettings[userId]) || {}) };
  }, [userSettings]);

  const updateMyNotifSettings = useCallback((userId, patch) => {
    setUserSettings(prev => {
      const next = {
        ...prev,
        [userId]: { notifyOnTaskAdded: true, notifyOnTaskReminder: true, ...(prev[userId] || {}), ...patch },
      };
      userSettingsRef.current = next;
      /* ユーザー操作 → API書き込み */
      if (apiLoadedRef.current) {
        apiSet("user_settings", { ...next, __panelTasks: panelTasksRef.current }).catch(console.error);
      }
      return next;
    });
  }, []);

  const setPanelTasks = useCallback((tasks) => {
    setPanelTasksRaw(tasks);
    panelTasksRef.current = tasks;
    /* ユーザー操作 → API書き込み */
    if (apiLoadedRef.current) {
      apiSet("user_settings", { ...userSettingsRef.current, __panelTasks: tasks }).catch(console.error);
    }
  }, []);

  /* ── 通知ログ ── */
  const [notifLogs, setNotifLogs] = useState(() => {
    const migrated = localStorage.getItem(LS_KEYS.NOTIF_MIGRATED);
    if (!migrated) {
      localStorage.removeItem(LS_KEYS.NOTIFS);
      localStorage.setItem(LS_KEYS.NOTIF_MIGRATED, "1");
      return [];
    }
    return lsGet(LS_KEYS.NOTIFS, []).filter(n => !!n.targetUser);
  });
  /* localStorage のみ同期（API書き込みは mutation 内） */
  useEffect(() => { lsSet(LS_KEYS.NOTIFS, notifLogs); }, [notifLogs]);

  const addNotifLog = useCallback((log) => {
    const entry = { id: `nlog_${Date.now()}`, isRead: false, createdAt: new Date().toISOString(), ...log };
    setNotifLogs(prev => {
      const next = [entry, ...prev].slice(0, 100);
      if (apiLoadedRef.current) apiSet("notifs", next).catch(console.error);
      return next;
    });
    return entry;
  }, []);

  const markNotifRead = useCallback((id) => {
    setNotifLogs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      if (apiLoadedRef.current) apiSet("notifs", next).catch(console.error);
      return next;
    });
  }, []);

  const markAllNotifsRead = useCallback((targetUser) => {
    setNotifLogs(prev => {
      const next = prev.map(n => {
        if (targetUser && n.targetUser && n.targetUser !== targetUser) return n;
        return { ...n, isRead: true };
      });
      if (apiLoadedRef.current) apiSet("notifs", next).catch(console.error);
      return next;
    });
  }, []);

  const clearNotifLogs = useCallback(() => {
    setNotifLogs([]);
    if (apiLoadedRef.current) apiSet("notifs", []).catch(console.error);
  }, []);

  /* ── タスク ── */
  const [tasks, setTasks] = useState(() => lsGet(LS_KEYS.TASKS, []));
  useEffect(() => { lsSet(LS_KEYS.TASKS, tasks); }, [tasks]);

  const addTask = useCallback((raw) => {
    const t = { ...raw, id: `task_${Date.now()}`, completed: false, createdAt: new Date().toISOString() };
    setTasks(prev => {
      const next = [t, ...prev];
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const updateTask = useCallback((id, patch) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks(prev => {
      const next = prev.map(t => t.id !== id ? t : {
        ...t,
        completed: !t.completed,
        completedAt: !t.completed ? new Date().toISOString() : null,
      });
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const generateMonthlyCheckTasks = useCallback((year, month) => {
    const newTasks = buildMonthlyTasks(year, month, MONTHLY_MEMBERS);
    let added = 0, skipped = 0;
    setTasks(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = newTasks.filter(t => {
        if (existingIds.has(t.id)) { skipped++; return false; }
        added++;
        return true;
      });
      if (toAdd.length === 0) return prev;
      const next = [...toAdd, ...prev];
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
    return { total: newTasks.length, added, skipped };
  }, []);

  /* ── 案件 ── */
  const [deals, setDeals] = useState(() => lsGet(LS_KEYS.DEALS, DEF_DEALS).map(_normDeal));
  useEffect(() => { lsSet(LS_KEYS.DEALS, deals); }, [deals]);

  /* ── 年月選択 ── */
  const [currentYear,  setCurrentYear]  = useState(_NOW.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(_NOW.getMonth() + 1);
  const [periodType,   setPeriodType]   = useState("month");

  const currentPeriod = `${currentYear}-${_PAD(currentMonth)}`;
  const _QM = { Q1:[1,2,3], Q2:[4,5,6], Q3:[7,8,9], Q4:[10,11,12] };
  const activePeriods = periodType === "month"
    ? [currentPeriod]
    : (_QM[periodType] || []).map(m => `${currentYear}-${_PAD(m)}`);

  const addDeal = useCallback((raw) => {
    const deal = {
      ...raw,
      id:         nextId(),
      amount:     parseAmt(raw.amount),
      phase:      resolvePhase(raw.confidence, raw.phase),
      is:         normalizeName(raw.is),
      fs:         normalizeName(raw.fs),
      period:     raw.period || currentPeriod,
      yomi:       resolveYomi(raw.yomi, raw.confidence),
      lossReason: raw.lossReason || "",
      createdAt:  raw.createdAt  || new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      activities: raw.activities || [],
    };
    setDeals(prev => {
      const next = [deal, ...prev];
      if (apiLoadedRef.current) apiSet("deals", next).catch(console.error);
      return next;
    });
    return deal;
  }, [currentPeriod]);

  const updateDeal = useCallback((id, patch) => {
    setDeals(prev => {
      const next = prev.map(d => {
        if (d.id !== id) return d;
        const n = { ...d, ...patch, amount: patch.amount !== undefined ? parseAmt(patch.amount) : d.amount };
        n.phase = resolvePhase(n.confidence, n.phase);
        n.is = normalizeName(n.is);
        n.fs = normalizeName(n.fs);
        n.updatedAt = new Date().toISOString();
        return n;
      });
      if (apiLoadedRef.current) apiSet("deals", next).catch(console.error);
      return next;
    });
  }, []);

  const deleteDeal = useCallback((id) => {
    setDeals(prev => {
      const next = prev.filter(d => d.id !== id);
      if (apiLoadedRef.current) apiSet("deals", next).catch(console.error);
      return next;
    });
  }, []);

  const addActivity = useCallback((dealId, act) => {
    const now = new Date().toISOString();
    setDeals(prev => {
      const next = prev.map(d => d.id !== dealId ? d : {
        ...d,
        activities: [...(d.activities || []), { id: nextId(), date: now, ...act }],
        updatedAt: now,
      });
      if (apiLoadedRef.current) apiSet("deals", next).catch(console.error);
      return next;
    });
  }, []);

  const deleteActivity = useCallback((dealId, actId) => {
    const now = new Date().toISOString();
    setDeals(prev => {
      const next = prev.map(d => d.id !== dealId ? d : {
        ...d,
        activities: (d.activities || []).filter(a => a.id !== actId),
        updatedAt: now,
      });
      if (apiLoadedRef.current) apiSet("deals", next).catch(console.error);
      return next;
    });
  }, []);

  const updateActivity = useCallback((dealId, actId, patch) => {
    const now = new Date().toISOString();
    setDeals(prev => {
      const next = prev.map(d => d.id !== dealId ? d : {
        ...d,
        activities: (d.activities || []).map(a => a.id !== actId ? a : { ...a, ...patch }),
        updatedAt: now,
      });
      if (apiLoadedRef.current) apiSet("deals", next).catch(console.error);
      return next;
    });
  }, []);

  const replaceDeals = useCallback((ds) => {
    setDeals(ds);
    if (apiLoadedRef.current) apiSet("deals", ds).catch(console.error);
  }, []);

  /* ── メンバー ── */
  const [members, setMembers] = useState(() => {
    const stored = lsGet(LS_KEYS.MEMBERS, DEF_MEMBERS);
    let result = stored.map(m => ({ ...m, name: normalizeName(m.name) }));
    const SUGIYAMA_TEAM_FIX = "honnoji_sugiyama_team_v1";
    if (!localStorage.getItem(SUGIYAMA_TEAM_FIX)) {
      result = result.map(m =>
        m.name === "杉山" && m.team === "全社FS"
          ? { ...m, team: "杉山T", role: "leader", badge: "IS+FS" }
          : m
      );
      localStorage.setItem(SUGIYAMA_TEAM_FIX, "1");
    }
    const PW_RESET_KEY = "honnoji_pw_reset_v1";
    if (!localStorage.getItem(PW_RESET_KEY)) {
      result = result.map(m => ({ ...m, pw: "1111" }));
      localStorage.setItem(PW_RESET_KEY, "1");
    }
    return result;
  });
  useEffect(() => { lsSet(LS_KEYS.MEMBERS, members); }, [members]);

  const updateMember = useCallback((id, patch) => {
    setMembers(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m);
      if (apiLoadedRef.current) apiSet("members", next).catch(console.error);
      return next;
    });
  }, []);

  const addMember = useCallback((raw) => {
    const m = { ...raw, id: `usr_${Date.now()}`, status: "active" };
    setMembers(prev => {
      const next = [...prev, m];
      if (apiLoadedRef.current) apiSet("members", next).catch(console.error);
      return next;
    });
    return m;
  }, []);

  const deleteMember = useCallback((id) => {
    setMembers(prev => {
      const next = prev.filter(m => m.id !== id);
      if (apiLoadedRef.current) apiSet("members", next).catch(console.error);
      return next;
    });
  }, []);

  const replaceMembers = useCallback((ms) => {
    setMembers(ms);
    if (apiLoadedRef.current) apiSet("members", ms).catch(console.error);
  }, []);

  /* ── 月末処理チェック ── */
  const [monthEndChecks, setMonthEndChecksState] = useState(() => lsGet(LS_KEYS.MONTH_END, {}));
  useEffect(() => { lsSet(LS_KEYS.MONTH_END, monthEndChecks); }, [monthEndChecks]);

  const setMonthEndCheck = useCallback((userId, ym, taskId, value) => {
    setMonthEndChecksState(prev => {
      const key      = `${userId}_${ym}`;
      const existing = prev[key];
      const current  = (!existing || Array.isArray(existing)) ? {} : { ...existing };
      current[taskId] = value;
      const next = { ...prev, [key]: current };
      if (apiLoadedRef.current) apiSet("monthend", next).catch(console.error);
      return next;
    });
  }, []);

  /* ── 要望 ── */
  const [requests, setRequests] = useState(() => lsGet(LS_KEYS.REQUESTS, []));
  useEffect(() => { lsSet(LS_KEYS.REQUESTS, requests); }, [requests]);
  const [requestNotifs, setRequestNotifs] = useState([]);

  const addRequest = useCallback((content, requester) => {
    const req = {
      id: `req_${Date.now()}`,
      user: requester || "",
      content,
      status: "未対応",
      notified: false,
      likes: [],
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => {
      const next = [req, ...prev];
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const resolveRequest = useCallback((id) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: "対応済" } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const toggleLike = useCallback((name) => (id) => {
    if (!name) return;
    setRequests(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const likes = r.likes ?? [];
        return { ...r, likes: likes.includes(name) ? likes.filter(n => n !== name) : [...likes, name] };
      });
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const deleteRequest = useCallback((id) => {
    setRequests(prev => {
      const next = prev.filter(r => r.id !== id);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const markRequestNotified = useCallback((id) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, notified: true } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
    setRequestNotifs(prev => prev.filter(r => r.id !== id));
  }, []);

  const dismissAllNotifs = useCallback((ids) => {
    setRequests(prev => {
      const next = prev.map(r => ids.includes(r.id) ? { ...r, notified: true } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
    setRequestNotifs([]);
  }, []);

  /* ── ロゴ（旗印） ── */
  const [logoDataUrl, setLogoDataUrl] = useState(
    () => localStorage.getItem("honnoji_favicon") || null
  );
  const saveLogo = useCallback((dataUrl) => {
    if (dataUrl) localStorage.setItem("honnoji_favicon", dataUrl);
    else localStorage.removeItem("honnoji_favicon");
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = dataUrl || DEFAULT_FAVICON_HREF;
    setLogoDataUrl(dataUrl || null);
  }, []);

  /* ══════════════════════════════════════════════════════
   * fetchAllFromAPI — GET 専用、書き込みは初回マイグレーションのみ
   *
   * 【マイグレーション条件】
   *   localStorage.getItem(key) !== null のときのみ移行
   *   → 新端末でキーが存在しない場合は DEF_XXX を API に送らない
   * ══════════════════════════════════════════════════════ */
  const fetchAllFromAPI = useCallback(async () => {
    try {
      const [
        apiDeals, apiTasks, apiMembers,
        apiRequests, apiNotifs, apiMonthEnd, apiUserSettings,
      ] = await Promise.all([
        apiGet("deals"),    apiGet("tasks"),   apiGet("members"),
        apiGet("requests"), apiGet("notifs"),  apiGet("monthend"),
        apiGet("user_settings"),
      ]);

      /* deals */
      if (Array.isArray(apiDeals) && apiDeals.length > 0) {
        setDeals(apiDeals.map(_normDeal));
      } else if (lsExists(LS_KEYS.DEALS)) {
        const local = lsGet(LS_KEYS.DEALS, []);
        if (local.length > 0) apiSet("deals", local).catch(console.error);
      }

      /* tasks */
      if (Array.isArray(apiTasks) && apiTasks.length > 0) {
        setTasks(apiTasks);
      } else if (lsExists(LS_KEYS.TASKS)) {
        const local = lsGet(LS_KEYS.TASKS, []);
        if (local.length > 0) apiSet("tasks", local).catch(console.error);
      }

      /* members */
      if (Array.isArray(apiMembers) && apiMembers.length > 0) {
        setMembers(apiMembers.map(m => ({ ...m, name: normalizeName(m.name) })));
      } else if (lsExists(LS_KEYS.MEMBERS)) {
        const local = lsGet(LS_KEYS.MEMBERS, []);
        if (local.length > 0) apiSet("members", local).catch(console.error);
      }

      /* requests */
      if (Array.isArray(apiRequests) && apiRequests.length > 0) {
        setRequests(apiRequests);
      } else if (lsExists(LS_KEYS.REQUESTS)) {
        const local = lsGet(LS_KEYS.REQUESTS, []);
        if (local.length > 0) apiSet("requests", local).catch(console.error);
      }

      /* notifLogs */
      if (Array.isArray(apiNotifs) && apiNotifs.length > 0) {
        setNotifLogs(apiNotifs.filter(n => !!n.targetUser));
      } else if (lsExists(LS_KEYS.NOTIFS)) {
        const local = lsGet(LS_KEYS.NOTIFS, []).filter(n => !!n.targetUser);
        if (local.length > 0) apiSet("notifs", local).catch(console.error);
      }

      /* monthEndChecks */
      if (apiMonthEnd && typeof apiMonthEnd === "object" && Object.keys(apiMonthEnd).length > 0) {
        setMonthEndChecksState(apiMonthEnd);
      } else if (lsExists(LS_KEYS.MONTH_END)) {
        const local = lsGet(LS_KEYS.MONTH_END, {});
        if (Object.keys(local).length > 0) apiSet("monthend", local).catch(console.error);
      }

      /* user_settings + panelTasks */
      if (apiUserSettings && typeof apiUserSettings === "object" && Object.keys(apiUserSettings).length > 0) {
        const { __panelTasks, ...uSettings } = apiUserSettings;
        if (Object.keys(uSettings).length > 0) {
          setUserSettings(uSettings);
          userSettingsRef.current = uSettings;
        }
        if (Array.isArray(__panelTasks) && __panelTasks.length > 0) {
          setPanelTasksRaw(__panelTasks);
          panelTasksRef.current = __panelTasks;
        }
      } else if (lsExists(LS_KEYS.USER_SETTINGS)) {
        const local = lsGet(LS_KEYS.USER_SETTINGS, {});
        if (Object.keys(local).length > 0) apiSet("user_settings", local).catch(console.error);
      }

      /* ── 正常応答: IP制限を解除（VPN復帰後ポーリングで自動回復） ── */
      setNetworkBlocked(false);
      setLastUpdatedAt(new Date());
      apiLoadedRef.current = true;
      setApiChecking(false);
      return true;

    } catch (e) {

      /* ── 403: IPホワイトリストで遮断 → アプリ全体をブロック画面へ ── */
      if (e instanceof ForbiddenError) {
        console.error("[IP ACCESS DENIED] Frontend blocked: 403 Forbidden from API.");
        setNetworkBlocked(true);
        setApiChecking(false);
        /* apiLoadedRef は true にしない（ブロック中は書き込みも禁止） */
        return false;
      }

      /* ── その他エラー（ネットワーク障害・タイムアウト等）→ キャッシュで継続 ── */
      console.warn("API unavailable, using local cache:", e.message);
      apiLoadedRef.current = true;
      setApiChecking(false);
      return false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* 初回マウント時のみ API から取得 */
  useEffect(() => {
    fetchAllFromAPI();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* 30秒ポーリング — GET のみ、state 更新のみ、書き込みなし */
  useEffect(() => {
    const id = setInterval(fetchAllFromAPI, 30_000);
    return () => clearInterval(id);
  }, [fetchAllFromAPI]);

  const refreshData = useCallback(() => fetchAllFromAPI(), [fetchAllFromAPI]);

  /* ── 認証 ── */
  const [currentUserId, setCurrentUserId] = useState(() => authLoad());

  const login = useCallback((userId, pw) => {
    const m = members.find(m => m.id === userId && m.pw === pw && m.status === "active");
    if (!m) return false;
    authSave(m.id);
    setCurrentUserId(m.id);
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setPeriodType("month");
    setActiveTab("マイ");
    setActiveView("summary");
    if (pw === "1111") setShowPwPrompt(true);
    const unnotified = requests.filter(r => r.user === m.name && r.status === "対応済" && !r.notified);
    if (unnotified.length > 0) setRequestNotifs(unnotified);
    return true;
  }, [members, requests]);

  const loginByName = useCallback((name, pw) => {
    const m = members.find(m => m.name === name && m.pw === pw && m.status === "active");
    if (!m) return false;
    authSave(m.id);
    setCurrentUserId(m.id);
    return true;
  }, [members]);

  const logout = useCallback(() => { authClear(); setCurrentUserId(null); }, []);

  const currentUser = members.find(m => m.id === currentUserId) ?? null;

  /* ── UI 状態 ── */
  const [activeTab,    setActiveTab]    = useState("マイ");
  const [activeView,   setActiveView]   = useState("summary");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [showNewDeal,  setShowNewDeal]  = useState(false);
  const [editingDeal,  setEditingDeal]  = useState(null);
  const [showPwPrompt, setShowPwPrompt] = useState(false);

  /* toggleLike は currentUser.name に依存 → ここで bind */
  const currentUserName = currentUser?.name || "";
  const toggleLikeBound = useCallback((id) => {
    if (!currentUserName) return;
    setRequests(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const likes = r.likes ?? [];
        return { ...r, likes: likes.includes(currentUserName) ? likes.filter(n => n !== currentUserName) : [...likes, currentUserName] };
      });
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, [currentUserName]);

  const addRequestBound = useCallback((content, requester) => {
    const req = {
      id: `req_${Date.now()}`,
      user: requester || currentUserName || "",
      content,
      status: "未対応",
      notified: false,
      likes: [],
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => {
      const next = [req, ...prev];
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, [currentUserName]);

  const dismissAllNotifsBound = useCallback(() => {
    const ids = requestNotifs.map(r => r.id);
    setRequests(prev => {
      const next = prev.map(r => ids.includes(r.id) ? { ...r, notified: true } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
    setRequestNotifs([]);
  }, [requestNotifs]);

  return (
    <AppContext.Provider value={{
      /* auth */
      currentUserId, currentUser, login, loginByName, logout,
      /* members */
      members, updateMember, addMember, deleteMember, replaceMembers,
      /* deals */
      deals, addDeal, updateDeal, deleteDeal,
      addActivity, deleteActivity, updateActivity,
      replaceDeals,
      /* tasks */
      tasks, addTask, updateTask, deleteTask, toggleTask,
      generateMonthlyCheckTasks,
      /* notifLogs */
      notifLogs, addNotifLog, markNotifRead, markAllNotifsRead, clearNotifLogs,
      /* userSettings */
      userSettings, getMyNotifSettings, updateMyNotifSettings,
      /* requests */
      requests,
      addRequest: addRequestBound,
      resolveRequest,
      toggleLike: toggleLikeBound,
      deleteRequest,
      markRequestNotified,
      requestNotifs,
      dismissAllNotifs: dismissAllNotifsBound,
      /* logo */
      logoDataUrl, saveLogo,
      /* pw prompt */
      showPwPrompt, setShowPwPrompt,
      /* period */
      currentYear, setCurrentYear,
      currentMonth, setCurrentMonth,
      periodType, setPeriodType,
      currentPeriod, activePeriods,
      /* 月末処理 */
      monthEndChecks, setMonthEndCheck,
      panelTasks, setPanelTasks,
      /* network — 403遮断ステート */
      networkBlocked, apiChecking, lastUpdatedAt,
      /* refresh */
      refreshData, fetchAllFromAPI,
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
