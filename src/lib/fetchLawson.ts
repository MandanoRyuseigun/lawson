// サーバー側（Route Handler）専用。公式サイトのページを取得する

/** 公式サイトのページを 1 件取得する。失敗したら例外を投げる */
export async function fetchLawsonPage(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; sale-notice-tool/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * 複数の処理を、同時に動かす数を抑えながら順に実行する（公式サイトへの負荷を抑えるため）。
 * 結果は入力と同じ順で返す。
 */
export async function mapWithLimit<T, R>(inputs: T[], limit: number, fn: (input: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(inputs.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, inputs.length) }, async () => {
    while (next < inputs.length) {
      const index = next++;
      results[index] = await fn(inputs[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
