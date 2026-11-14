const expiry = 'Max-Age=31536000; Path=/; SameSite=Lax';
let unavailable = false;

function readCookie(key) {
  try {
    const prefix = key+'=';
    const entry = document.cookie.split(';').map(item=>item.trim()).find(item=>item.startsWith(prefix));
    return entry ? JSON.parse(decodeURIComponent(entry.slice(prefix.length))) : undefined;
  } catch { return undefined; }
}

function writeCookie(key,value) {
  try {
    const encoded = encodeURIComponent(JSON.stringify(value));
    document.cookie = key+'='+encoded+'; '+expiry;
    if (!document.cookie.split(';').some(item=>item.trim()===key+'='+encoded)) throw new Error('Cookie unavailable');
    return true;
  } catch {
    unavailable = true;
    const notice = document.getElementById('cookie-status');
    if (notice) notice.hidden = false;
    return false;
  }
}

function readStorage(key) {
  const value = readCookie(key);
  if (value !== undefined) return value;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const previous = JSON.parse(raw);
      if (writeCookie(key,previous)) localStorage.removeItem(key);
      return previous;
    }
  } catch {}
  return {};
}

function checkCookies() {
  if (!unavailable && writeCookie('practica-cookie-test',1)) {
    document.cookie = 'practica-cookie-test=; Max-Age=0; Path=/; SameSite=Lax';
  }
}

export { readStorage, writeCookie, checkCookies };
