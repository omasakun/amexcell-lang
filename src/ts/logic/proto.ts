import { Lit, ListLit, lit2str as l2s, PropLit, lit2str } from './literal';
import { neverHere } from '../util';
import { Size2D } from './worksheet';
/*
- ***Proto: Prototype. セルの参照などか解決されていないやつ
- ***Inst: Instance. セルの参照とかがオブジェクトの参照として解決されているやつ
*/

export interface Cell {
	name: string
	size: Size2D
}

export interface Module {
	t: "module"
	name: string
	in: Map<string, Cell>
	out: Map<string, Cell>
	var: Map<string, Cell>
	modules: Map<string, string>
	eqs: Equation[]
}

export interface Equation { cell: VarExpr | PortExpr, expr: Expr }

export interface PortRef { mName: string, port: string, x: number, y: number, w?: number, h?: number }
export interface CellRef { name: string, x: number, y: number, w?: number, h?: number }

export type Expr = NumExpr | StrExpr | RawExpr | ArrExpr | FuncExpr | VarExpr | PortExpr;
export interface NumExpr { t: "num", v: number }
export interface StrExpr { t: "str", v: string }
export interface RawExpr { t: "raw", v: string }
export interface ArrExpr { t: "arr", v: (NumExpr | StrExpr | (NumExpr | StrExpr)[])[] }
export interface FuncExpr { t: "func", fn: string, args: Expr[] }
export interface VarExpr { t: "var", cell: CellRef }
export interface PortExpr { t: "port", port: PortRef }

export function lit2proto(lit: ListLit[]): Map<string, Module> {
	const modules = lit.map(v => parseModule(v));
	const result: Map<string, Module> = new Map();
	modules.forEach(m => {
		if (result.has(m.name)) {
			throw `モジュール名が重複しています。 Name: ${m.name}`;
		}
		result.set(m.name, m);
	});
	return result;
}
export function proto2str(p: Expr | Module): string {
	if (p.t === "str" || p.t === "num" || p.t === "raw") {
		return lit2str(p);
	}
	if (p.t === "arr") {
		return lit2str({ t: p.t, v: p.v.map(v => Array.isArray(v) ? { t: "arr", v } : v) });
	}
	if (p.t === "var") {
		const c = p.cell;
		let result = "@" + c.name;
		if (c.x !== 0 || c.w) result += ":x" + c.x + (c.w ? ".." + (c.w + c.x - 1) : "");
		if (c.y !== 0 || c.h) result += ":y" + c.y + (c.h ? ".." + (c.h + c.y - 1) : "");
		return result;
	}
	if (p.t === "port") {
		const c = p.port;
		let result = "@" + c.mName + "." + c.port;
		if (c.x !== 0 || c.w) result += ":x" + c.x + (c.w ? ".." + (c.w + c.x - 1) : "");
		if (c.y !== 0 || c.h) result += ":y" + c.y + (c.h ? ".." + (c.h + c.y - 1) : "");
		return result;
	}
	if (p.t === "func") {
		return p.fn + "(" + p.args.map(v => proto2str(v)).join(" ") + ")";
	}
	if (p.t === "module") {
		const header = "module " + p.name;
		let body: string[] = [];
		p.in.forEach(v => body.push(`in  ${v.name} ${v.size.w}x${v.size.h}`));
		p.out.forEach(v => body.push(`out ${v.name} ${v.size.w}x${v.size.h}`));
		p.var.forEach(v => body.push(`var ${v.name} ${v.size.w}x${v.size.h}`));
		p.modules.forEach((moduleN, insN) => body.push(`new ${insN}::${moduleN}`));
		p.eqs.forEach(v => body.push(`${proto2str(v.cell)} = ${proto2str(v.expr)}`));
		return [header, ...body.map(v => "  " + v)].join("\n");
	}
	throw neverHere(p);
}
function parseModule(lit: ListLit): Module {
	const l = lit.v;
	if (l.length <= 1 || !isLitSymbol("def")(l[0]) || l[1].t !== "name")
		throw `モジュールを期待しましたが、モジュールとして不正な式がありました。\nExpr: ${l2s(lit)}`;
	const defs = l.slice(2);
	const result: Module = { t: "module", name: l[1].v, eqs: [], in: new Map(), out: new Map(), var: new Map(), modules: new Map() };
	const varNames: Set<string> = new Set();
	defs.forEach(def => {
		if (def.t !== "list")
			throw `モジュール定義の直下にリストでないものがありますが、不正です。\nExpr: ${l2s(def)}\n in ${l2s(lit)}`;
		if (def.v.length === 0)
			throw `モジュール定義の直下に空リストがありますが、不正です。\nExpr: ${l2s(def)}\n in ${l2s(lit)}`;
		const t = def.v[0]; // Type of the definition
		const body = def.v.slice(1);
		if (isLitSymbol("in")(t)) {
			const cp = parseVarDef(def);
			if (varNames.has(cp.name))
				throw `inで定義された変数名は重複しています。\nName: ${cp.name}\nExpr: ${l2s(def)}\nin ${l2s(lit)}`;
			varNames.add(cp.name); result.in.set(cp.name, cp);
		} else if (isLitSymbol("out")(t)) {
			const cp = parseVarDef(def);
			if (varNames.has(cp.name))
				throw `outで定義された変数名は重複しています。\nName: ${cp.name}\nExpr: ${l2s(def)}\nin ${l2s(lit)}`;
			varNames.add(cp.name); result.out.set(cp.name, cp);
		} else if (isLitSymbol("var")(t)) {
			const cp = parseVarDef(def);
			if (varNames.has(cp.name))
				throw `varで定義された変数名は重複しています。\nName: ${cp.name}\nExpr: ${l2s(def)}\nin ${l2s(lit)}`;
			varNames.add(cp.name); result.var.set(cp.name, cp);
		} else if (isLitSymbol("new")(t)) {
			if (body.length !== 2 || body[0].t !== "name" || body[1].t !== "name")
				throw `newの定義が不正です。\nExpr: ${l2s(def)}\nin ${l2s(lit)}`;
			const instanceName = body[0].v, moduleName = body[1].v;
			if (result.modules.has(instanceName))
				throw `newで定義された変数名は重複しています。\nName: ${instanceName}\nExpr: ${l2s(def)}\nin ${l2s(lit)}`;
			result.modules.set(instanceName, moduleName);
		} else if (isLitSymbol("=")(t)) {
			if (body.length !== 2)
				throw `代入文の定義が不正です。\nExpr: ${l2s(def)}\nin ${l2s(lit)}`;
			const cell = parseRef(body[0]), expr = parseExpr(body[1]);
			const eq: Equation = { cell, expr };
			result.eqs.push(eq);
		} else {
			throw `モジュール定義の直下にリストがありますが、不正です。\nExpr: ${l2s(def)}\n in ${l2s(lit)}`;
		}
	});
	return result;
}
/** リストの第一項目は、変数の種類を表すin, outなど */
function parseVarDef(lit: ListLit): Cell {
	if (lit.v.length <= 1 || lit.v[1].t !== "name" || lit.v.slice(2).findIndex(v => v.t !== "prop") >= 0)
		throw `変数定義が不正です。\nExpr: ${l2s(lit)}`;
	const name = lit.v[1].v as string;
	let w = NaN, h = NaN;
	lit.v.slice(2).forEach(prop => {
		const p = prop as PropLit;
		if ((p.name === "w" || p.name === "h") && typeof p.v === "number") {
			if ((p.name === "w" && !isNaN(w)) || (p.name === "h" && !isNaN(h))) {
				throw `変数のプロパティが重複して定義されています。\nExpr: ${l2s(p)}\nin ${l2s(lit)}`;
			}
			if (p.name === "w") w = p.v;
			else if (p.name === "h") h = p.v;
			else neverHere(p.name);
		} else {
			throw `変数のプロパティが不正です。\nExpr: ${l2s(p)}\nin ${l2s(lit)}`;
		}
	});
	if (isNaN(w)) w = 1;
	if (isNaN(h)) h = 1;
	return { name, size: { w, h } };
}
function parseExpr(lit: Lit): Expr {
	if (lit.t === "num") return lit;
	if (lit.t === "str") return lit;
	if (lit.t === "raw") return lit;
	if (lit.t === "prop") throw `変数参照を覗いて、代入式内でのプロパティ宣言は不正です。\nExpr: ${l2s(lit)}`;
	if (lit.t === "name") return parseRef(lit);
	if (lit.t === "list") { // function call / variable reference
		if (lit.v.length >= 2 && lit.v.slice(1).findIndex(v => v.t === "prop") >= 0) { // variable reference
			return parseRef(lit);
		} else { // function call
			return parseFunc(lit);
		}
	}
	if (lit.t === "arr") {
		const result: ArrExpr = {
			t: "arr",
			v: lit.v.map(v => {
				if (v.t === "arr")
					return v.v.map(v => {
						if (v.t === "arr")
							throw `3重以上の配列はExcelが受け付けてくれません。\nExpr: ${l2s(lit)}`;
						else return v;
					});
				return v;
			})
		};
		return result;
	}
	throw neverHere(lit);
}
function parseRef(lit: Lit): VarExpr | PortExpr {
	const nameParser =
		(str: string): ({ t: "port", module: string, port: string } | { t: "var", name: string }) => {
			const parts = str.split(".");
			if (parts.length === 0 || parts.length > 2)
				throw `セルの参照の、文字列部分が不正です。\nExpr: ${l2s(lit)}`;
			if (parts.length === 1) return { t: "var", name: parts[0] };
			return { t: "port", module: parts[0], port: parts[1] };
		}
	if (lit.t === "name") {
		const t = nameParser(lit.v);
		if (t.t === "port") return { t: "port", port: { mName: t.module, port: t.port, x: 0, y: 0 } };
		else if (t.t === "var") return { t: "var", cell: { name: t.name, x: 0, y: 0 } };
		else throw neverHere(t);
	} else if (lit.t === "list") {
		const l = lit.v;
		if (l.length === 0 || l[0].t !== "name" || l.slice(1).findIndex(v => v.t !== "prop") >= 0)
			throw `セルへの参照を期待しましたが、不正です。\nExpr: ${l2s(lit)}`;
		const t = nameParser(l[0].v);
		let x = NaN, y = NaN, w = NaN, h = NaN;
		l.slice(1).forEach(prop => {
			const p = prop as PropLit;
			if (p.name === "x" || p.name === "y") {
				if ((p.name === "x" && !isNaN(x)) || (p.name === "y" && !isNaN(y))) {
					throw `セルへの参照のプロパティが重複して定義されています。\nExpr: ${l2s(p)}\nin ${l2s(lit)}`;
				}
				if (p.name === "x") {
					if (typeof p.v === "number") {
						x = p.v;
					} else {
						x = p.v.min;
						w = p.v.max - p.v.min + 1;
					}
				} else if (p.name === "y") {
					if (typeof p.v === "number") {
						y = p.v;
					} else {
						y = p.v.min;
						h = p.v.max - p.v.min + 1;
					}
				} else neverHere(p.name);
			} else {
				throw `セルへの参照のプロパティが不正です。\nExpr: ${l2s(p)}\nin ${l2s(lit)}`;
			}
		});
		let ow = isNaN(w) ? (isNaN(x) && isNaN(y) ? {} : { w: 1 }) : { w };
		let oh = isNaN(h) ? (isNaN(x) && isNaN(y) ? {} : { h: 1 }) : { h };
		if (isNaN(x)) x = 0;
		if (isNaN(y)) y = 0;
		if (t.t === "port") return { t: "port", port: { mName: t.module, port: t.port, x, y, ...ow, ...oh } };
		else if (t.t === "var") return { t: "var", cell: { name: t.name, x, y, ...ow, ...oh } };
		else throw neverHere(t);
	} else throw `セルへの参照を期待しましたが、不正です。\nExpr: ${l2s(lit)}`;
}
function parseFunc(lit: ListLit): FuncExpr {
	if (lit.v.length === 0 || lit.v[0].t !== "name")
		throw `関数呼び出しとして不正です。\nExpr: ${l2s(lit)}`;
	const fn = lit.v[0].v;
	const args = lit.v.slice(1).map(v => parseExpr(v));
	return { t: "func", fn, args };
}

function isLitSymbol(str: string) {
	return (lit: Lit) => lit.t === "name" && lit.v === str;
}
