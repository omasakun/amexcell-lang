import { choice, drop, map, Parser, reg, repeat as rep, seq_all as seq, token, lazy } from "./parser";

interface Line {
	ln: number
	s: string
}
function isLine(l: any): l is Line {
	return typeof l.ln === "number" && typeof l.s === "string";
}
interface LineWithIndent {
	line: Line
	indents: string
}
function captureIndents(text: string): LineWithIndent[] {
	return text
		.split("\n")
		.map((text, ln) => {
			const line = { s: text.replace(/^\s+/, ""), ln };
			const indents = text.substr(0, text.length - line.s.length);
			return { line, indents };
		});
}
interface LineTree {
	line: Line
	contents: (Line | LineTree)[]
}
function processIndents(text: LineWithIndent[]): { remaining: LineWithIndent[], trees: (Line | LineTree)[] } {
	const indent = text[0].indents;
	const trees: (LineTree | Line)[] = [];
	let remaining = text;
	while (remaining.length > 0) {
		if (remaining[0].indents === indent) {
			const line = remaining.shift()!.line;
			if (remaining.length >= 1) {
				if (
					remaining[0].indents !== indent &&
					remaining[0].indents.startsWith(indent)
				) {
					const contents = processIndents(remaining);
					remaining = contents.remaining;
					trees.push({ contents: contents.trees, line });
					continue;
				}
			}
			trees.push(line);
		} else {
			// wrong indentation
			return { remaining, trees };
		}
	}
	return { remaining, trees };
};
export function parseIndents(text: string): LineTree[] {
	const result = processIndents(captureIndents(text));
	if (result.remaining.length > 0) {
		throw `正しくないインデントがなされています。 Line: ${result.remaining[0].line.ln}`;
	}
	const stringElm = result.trees.find(isLine);
	if (stringElm) {
		throw `トップレベルにブロックを構成しないものがあります。Line: ${stringElm.ln}`;
	}
	return result.trees as LineTree[];
}
interface Size2D {
	w: number
	h: number
}
interface Module_1 {
	name: string
	in: Map<string, Size2D>
	out: Map<string, Size2D>
	var: Map<string, Size2D>
	equations: string[] // TODO
}
export function parseModule(tree: LineTree) {
	if (!tree.line.s.match(/^def\s+/)) {
		throw `モジュールの定義がなされるべきところで、そうではないものが書いてあります。 Line: ${tree.line.ln}`;
	}
	const moduleName = tree.line.s.replace(/^def\s+/, "").trim();
	if (!moduleName.match(/[a-zA-Z_]\w*/)) {
		throw `モジュールの定義として不正です。形式: "def [module-name]" Line: ${tree.line.ln}`;
	}
	const result: Module_1 = { name: moduleName, equations: [], in: new Map(), out: new Map(), var: new Map() };
	const contents = tree.contents;
	contents.forEach(content => {
		if (!isLine(content)) {
			throw `モジュール内にブロックが書かれていますが、それは不正です。 Line: ${content.line.ln}`;
		}
		const { s, ln } = content;
		const fn = (reg: RegExp, map: Map<string, Size2D>) => {
			if (s.match(reg)) {
				const vars = parseVarDefs(s.replace(reg, ""), ln);
				vars.forEach(v => {
					if (map.has(v.name)) {
						throw `変数の定義が重複しています。 Line: ${ln} Name: ${v.name}`;
					}
					map.set(v.name, v.size);
				});
				return true;
			}
			return false;
		}
		if (fn(/^in\s+/, result.in)) {
			// Do nothing
		} else if (fn(/^out\s+/, result.out)) {
			// Do nothing
		} else if (fn(/^var\s+/, result.var)) {
			// Do nothing
		} else if(s.match(/^new\s+/)){
			
		} else {
			
		}
	});
	return result;
}
export function parseVarDefs(text: string, ln: number): { name: string, size: Size2D }[] {
	const head = <T>(s: T[]) => s[0];
	const oneReg = (r: RegExp) => map(reg(r), head);
	const optional = <T>(default_value: T, p: Parser<T>) => choice<T>(p, t => ({ t, v: default_value }));
	const sp = drop(reg(/^\s*/m));
	const nonneg = map(oneReg(/^(0|[1-9][0-9]*)/), s => parseInt(s)); // non-negative natural number
	const var_with_props = rep(
		map(
			seq(
				oneReg(/^([a-zA-Z_]\w*)/), sp,
				optional([], map(seq(
					token("["), sp,
					rep(
						map(
							seq(
								oneReg(/^(w|h)/), sp, token(":"), sp, nonneg, sp
							),
							v => ({ prop: v[0], v: v[4] })
						),
						{ min: 1 }
					),
					token("]")
				), v => v[2])), sp
			),
			v => {
				const name = v[0], props = v[2];
				const size: Size2D = { w: NaN, h: NaN };
				props.forEach(prop => {
					if (prop.prop === "w") {
						if (!isNaN(size.w)) throw `変数定義内で、プロパティが重複しています。 Var: ${name} Prop: w Line: ${ln}`;
						size.w = prop.v;
						return;
					}
					if (prop.prop === "h") {
						if (!isNaN(size.h)) throw `変数定義内で、プロパティが重複しています。 Var: ${name} Prop: h Line: ${ln}`;
						size.h = prop.v;
						return;
					}
				});
				if (isNaN(size.w)) size.w = 1;
				if (isNaN(size.h)) size.h = 1;
				return { name, size };
			}
		)
	);

	const result = var_with_props(text);
	if (!result || result.t !== "") {
		throw `文脈からして変数定義と思われるものがありましたが、正しくない形式です。 Line: ${ln} Text: ${text}`;
	}
	return result.v;
}
function parseEquation(text: string, ln: number) {
	const dec_eq = map(seq(choice<R<typeof var_ref | typeof port_ref>>(var_ref, port_ref), sp, token("="), sp, formulaLazy), v => tuple(v[0], v[4]));
}