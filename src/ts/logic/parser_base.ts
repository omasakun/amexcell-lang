// 基本的なパーサー関数群

// 本ファイルは、メモリ使用量やパフォーマンスを一切考慮せずに作成された。
// ただ、富豪的プログラミングが許されるこの世の中であれば、素早く動くものを作ってもいいかなぁ、と思ったのです。

export type Parser<T> = (t: string) => { v: T, t: string } | null;

// 正規表現。キャプチャーされた文字列を返す
export function reg(reg: RegExp): Parser<string[]> {
	return t => {
		const out = reg.exec(t);
		if (!out) return null;
		return { v: out.slice(1), t: t.substr(out[0].length) };
	}
}
// 文字列。マッチした文字列を返す
export function token(str: string): Parser<string> {
	return t => {
		if (!t.startsWith(str)) return null;
		return { v: str, t: t.substr(str.length) };
	}
}
// 返却された値をマッピングする
export function map<T, U>(p: Parser<T>, map: (v: T) => U): Parser<U> {
	return t => {
		const out = p(t);
		if (!out) return null;
		return { v: map(out.v), t: out.t };
	}
}
// 返却された値を捨てる
export function drop(p: Parser<any>): Parser<null> {
	return t => {
		const out = p(t);
		if (!out) return null;
		return { v: null, t: out.t };
	}
}
// 最もはじめに成功したものを返す FIXME:方を､引数のユニオンにしたい
export function choice<T>(...ps: Parser<T>[]): Parser<T> {
	return t => {
		for (let i = 0; i < ps.length; i++) {
			const p = ps[i];
			const out = p(t);
			if (!out) continue;
			return out;
		}
		return null;
	}
}
// min回以上max回以下の繰り返しにヒットする
export function repeat<T>(p: Parser<T>, { min = 0, max = Infinity } = {}): Parser<T[]> {
	return t => {
		const results: T[] = [];
		while (true) {
			const out = p(t);
			if (out) {
				results.push(out.v);
				t = out.t;
			}
			const len = results.length;
			if (len > max) return null;
			if (!out) {
				if (min <= len && len <= max) return { t, v: results };
				return null;
			}
		}
	}
}
// 与えられた順に全てのパーサーが成功したときにのみ値を返す
export function seq_all<T extends any[]>(...ps: { [I in keyof T]: Parser<T[I]> }): Parser<T> {
	return t => {
		//@ts-ignore WARN:いい感じの方にすることができなかった... (ついでにいうと、pushも型エラーの危険性をはらんでいる)
		const results: T = [];
		for (let i = 0; i < ps.length; i++) {
			const p = ps[i];
			const out = p(t);
			if (!out) return null;
			results.push(out.v);
			t = out.t;
		}
		return { t, v: results };
	}
}
// FIXME:最終的には､すべてのParserをLazyにする。
export function lazy<T>(p: () => Parser<T>): Parser<T> {
	return t => {
		const result = p()(t);
		return result;
	}
}
