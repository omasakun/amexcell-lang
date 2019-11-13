import { Parser, map, seq_all as seq, token, choice, repeat as rep, reg, lazy } from './parser_base';
/*
# Grammar
行区切りは、空白文字と同様に扱われる。ただし、エラー表示が行番号でなされるという都合上、特別な扱いをする。
要素は、次の通り。
- 12: 数値リテラル。NumLit
- "foo\"bar\"buz": 文字列リテラル。StrLit
- #"Sheet1!A1": そのままExcel関数に出力されるリテラル。RawLit
- foo, <=, +: 変数名・関数名・命令名リテラル。NameLit
- x:1..2: プロパティ的なリテラル。PropLit
- [1 2 3]: 定数の表として出力されるリテラル。ArrLit
- (1 2 3): いつもの。ListLit
*/

type Lit = NumLit | NameLit | PropLit | StrLit | RawLit | ArrLit | ListLit;

interface NumLit { t: "num", v: number }
interface StrLit { t: "str", v: string }
interface RawLit { t: "raw", v: string }
interface NameLit { t: "name", v: string }
interface PropLit { t: "prop", name: string, v: number | { min: number, max: number } }
interface ArrLit { t: "arr", v: (NumLit | StrLit | ArrLit)[] }
interface ListLit { t: "list", v: Lit[] }

interface Line {
	ln: number
	line: string
}
function stripComments(text: string): Line[] {
	return text.split("\n")
		.map((line, ln) => ({ line, ln }))
		.map(l => ({ ln: l.ln, line: l.line.trim() }))
		.filter(l => !l.line.startsWith(";"));
}
export function parser(text: string) {
	const result = sourceParser(stripComments(text).map(v => v.line).join(" "));
	return result;
}

const head = <T>(a: T[]) => a[0];
const tuple = <T extends any[]>(...args: T) => args;
const regOne = (r: RegExp) => map(reg(r), head);
const sp = reg(/^(\s*)/);

const numParser: Parser<NumLit> = (t: string) => {
	const token = t.match(/^([0-9]+(?:\.[0-9]+)?)/);
	if (!token) return null;
	const num = parseFloat(token[0]);
	if (isNaN(num)) return null;
	return { v: { t: "num", v: num }, t: t.substr(token[0].length) };
};
const strLikeParser: Parser<string> = map(seq(
	token('"'),
	rep(choice(token(`\\"`), regOne(/^([^"\\]+)/))),
	token('"')
), items => items[1].join());
const strParser: Parser<StrLit> = map(strLikeParser, v => ({ t: "str", v }));
const rawParser: Parser<RawLit> = map(seq(token('#'), strLikeParser), v => ({ t: "raw", v: v[1] }));
const nameParser: Parser<NameLit> = (t: string) => {
	const token = t.match(/^([^\s0-9"#()[\]][^\s()[\]]*)/);
	if (!token) return null;
	return { v: { t: "name", v: token[0] }, t: t.substr(token[0].length) };
};
const propParser: Parser<PropLit> = map(seq(
	regOne(/^(\w+)/),
	token(":"),
	choice<number | { min: number, max: number }>(
		map(reg(/^([0-9]+)\.\.([0-9]+)/), v => ({ min: parseInt(v[0]), max: parseInt(v[1]) })),
		map(regOne(/^([0-9]+)/), v => parseInt(v))
	)
), v => ({ t: "prop", name: v[0], v: v[2] }));
const arrParser: Parser<ArrLit> = map(seq(
	token("["), sp,
	rep(map(seq(
		choice<ArrLit | StrLit | NumLit>(lazy(() => arrParser), strParser, numParser), sp
	), v => v[0])),
	token("]")
), v => ({ t: "arr", v: v[2] }));
const listParser: Parser<ListLit> = map(seq(
	token("("), sp,
	rep(map(seq(
		choice<Lit>(lazy(() => arrParser), lazy(() => listParser), strParser, rawParser, numParser, propParser, nameParser), sp
	), v => v[0])),
	token(")")
), v => ({ t: "list", v: v[2] }));
const sourceParser: Parser<ListLit[]> = rep(map(seq(sp, listParser, sp), v => v[1]));