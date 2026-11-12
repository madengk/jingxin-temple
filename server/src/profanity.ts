/** Basic nickname validation and a small profanity list (server-authoritative). */

const BANNED = [
  // English
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "nigger", "nigga",
  "retard", "whore", "slut", "cock", "faggot", "motherfucker", "porn", "sex",
  // Chinese (common insults / explicit)
  "傻逼", "傻b", "傻比", "煞笔", "操你", "操逼", "草你", "草泥", "妈的", "妈逼",
  "妈b", "你妈", "妳妈", "去死", "畜生", "混蛋", "王八蛋", "滚蛋", "白痴",
  "脑残", "智障", "贱逼", "贱货", "婊子", "妓女", "强奸", "口交", "鸡巴",
  "阴茎", "阴道", "屁眼", "性交", "做爱", "约炮", "嫖", "卖淫", "鸡巴",
  "法轮", "法輪", "台独", "台獨", "藏独", "疆独", "习包子", "习近平",
];

export function graphemeLength(s: string): number {
  return Array.from(s).length;
}

export function normalizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim();
}

export function isProfane(name: string): boolean {
  const lower = name.toLowerCase().replace(/[\s_\-\.·•]+/g, "");
  return BANNED.some((w) => lower.includes(w.toLowerCase()));
}

export type NameResult = { ok: true; name: string } | { ok: false; reason: string };

export function validateName(raw: unknown): NameResult {
  const name = normalizeName(raw);
  const len = graphemeLength(name);
  if (len < 2) return { ok: false, reason: "法号至少两个字" };
  if (len > 12) return { ok: false, reason: "法号不可超过十二字" };
  // Allow CJK, letters, numbers, middle-dot, underscore
  if (!/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9_·•\-]+$/u.test(name)) {
    return { ok: false, reason: "法号仅可用汉字、字母、数字" };
  }
  if (isProfane(name)) return { ok: false, reason: "此名不宜，请另请一个清净法号" };
  return { ok: true, name };
}
