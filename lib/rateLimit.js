// /lib/rateLimit.js
// Rate Limiting untuk Zey AI
// Update: 15 Juni 2026

// Simpan data rate limit di Map (reset tiap deployment)
// Nanti bisa upgrade ke Redis kalau sudah besar

const userLimits = new Map();  // user ID → { count, resetTime }
const ipLimits = new Map();    // IP → { count, resetTime }
const globalLimits = { count: 0, resetTime: Date.now() + 60000 };

// Konfigurasi
const LIMITS = {
  user: { max: 20, window: 60000 },    // 20 req/menit per user
  ip:   { max: 10, window: 60000 },    // 10 req/menit per IP
  global: { max: 50, window: 60000 },  // 50 req/menit total
};

// Fungsi cek rate limit
export function checkRateLimit(userId, ip) {
  const now = Date.now();
  
  // 1. Cek global limit
  if (now > globalLimits.resetTime) {
    globalLimits.count = 0;
    globalLimits.resetTime = now + LIMITS.global.window;
  }
  
  if (globalLimits.count >= LIMITS.global.max) {
    const retryAfter = Math.ceil((globalLimits.resetTime - now) / 1000);
    return {
      allowed: false,
      message: `⚠️ Server sibuk. Coba lagi dalam ${retryAfter} detik.`,
      retryAfter
    };
  }
  
  // 2. Cek user limit (jika login)
  if (userId) {
    const userData = userLimits.get(userId);
    
    if (!userData || now > userData.resetTime) {
      userLimits.set(userId, { count: 1, resetTime: now + LIMITS.user.window });
    } else if (userData.count >= LIMITS.user.max) {
      const retryAfter = Math.ceil((userData.resetTime - now) / 1000);
      return {
        allowed: false,
        message: `⚠️ Terlalu banyak request. Coba lagi dalam ${retryAfter} detik.`,
        retryAfter
      };
    } else {
      userData.count++;
    }
  }
  
  // 3. Cek IP limit (jika tidak login)
  if (!userId && ip) {
    const ipData = ipLimits.get(ip);
    
    if (!ipData || now > ipData.resetTime) {
      ipLimits.set(ip, { count: 1, resetTime: now + LIMITS.ip.window });
    } else if (ipData.count >= LIMITS.ip.max) {
      const retryAfter = Math.ceil((ipData.resetTime - now) / 1000);
      return {
        allowed: false,
        message: `⚠️ Terlalu banyak request. Login untuk limit lebih besar. Coba lagi dalam ${retryAfter} detik.`,
        retryAfter
      };
    } else {
      ipData.count++;
    }
  }
  
  // 4. Semua OK
  globalLimits.count++;
  
  return {
    allowed: true,
    remaining: userId 
      ? LIMITS.user.max - (userLimits.get(userId)?.count || 0)
      : LIMITS.ip.max - (ipLimits.get(ip)?.count || 0),
    message: null
  };
}

// Fungsi dapatkan info limit untuk user
export function getLimitInfo(userId, ip) {
  const now = Date.now();
  
  if (userId) {
    const data = userLimits.get(userId);
    if (!data || now > data.resetTime) {
      return { remaining: LIMITS.user.max, total: LIMITS.user.max };
    }
    return { remaining: Math.max(0, LIMITS.user.max - data.count), total: LIMITS.user.max };
  }
  
  if (ip) {
    const data = ipLimits.get(ip);
    if (!data || now > data.resetTime) {
      return { remaining: LIMITS.ip.max, total: LIMITS.ip.max };
    }
    return { remaining: Math.max(0, LIMITS.ip.max - data.count), total: LIMITS.ip.max };
  }
  
  return { remaining: 0, total: 0 };
}
