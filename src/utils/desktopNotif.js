/**
 * ブラウザデスクトップ通知ユーティリティ
 */

const ICON = "/favicon.ico";

/** 通知許可を要求（まだ決まっていない場合のみ） */
export async function requestNotifPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

/**
 * デスクトップ通知を発火
 * @param {string} title
 * @param {string} body
 * @param {function} [onClick] - 通知クリック時のコールバック
 * @returns {Notification|null}
 */
export function fireNotif(title, body, onClick) {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;
  const n = new Notification(title, { body, icon: ICON, badge: ICON });
  n.onclick = () => {
    window.focus();
    if (onClick) onClick();
    n.close();
  };
  return n;
}
