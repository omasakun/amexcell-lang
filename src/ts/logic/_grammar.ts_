// Amexcell language の文法要素

import { choice, drop, map, Parser, reg, repeat as rep, seq_all as seq, token, lazy } from "./parser";
import { polyfill_flat } from "./flat-polyfill";
polyfill_flat();
type R<T> = T extends Parser<infer R> ? R : null; // result type
export type ParserInner<T> = R<T>;

const head = <T>(s: T[]) => s[0];
const reg_drop = (r: RegExp) => drop(reg(r));
function tag<T extends string, U>(tag: T, p: Parser<U>): Parser<{ _: T, v: U }> {
	return s => {
		const result = p(s);
		if (!result) return null;
		return { t: result.t, v: { _: tag, v: result.v } };
	}
}
const tuple = <T extends any[]>(...t: T) => t;
const oneReg = (r: RegExp) => map(reg(r), head);
const optional = <T>(default_value: T, p: Parser<T>) => choice<T>(p, t => ({ t, v: default_value }));

export const num = tag("num", oneReg(/^(0(?:\.[0-9]+)?|-?[1-9][0-9]*(?:\.[0-9]+)?)/));
export const str = tag("str", map(oneReg(/^"((?:""|[^"])*)"/), t => t.replace(/\"\"/g, "\"")));
export const op = tag("op", oneReg(/^([+\-/*^%>=<&]|<=|>=|<>)/));

// a -> 1, b -> 2, ...
const abc2num = (() => {
	const a_code = "a".charCodeAt(0);
	const tmp: (s: string) => number
		= s => s.length == 0 ? 0 : tmp(s.substr(0, s.length - 1)) * 26 + (s.charCodeAt(s.length - 1) - a_code + 1);
	return (s: string) => tmp(s.toLowerCase());
})();

const cell_name
	= tag("cell", map(reg(/^([a-zA-Z]+)([1-9][0-9]*)/), s => tuple(abc2num(s[0]), parseInt(s[1]))));

export const cells_ref
	= tag("cells_ref", map(seq(token("@"), choice(
		map(seq(cell_name, token(":"), cell_name), s => tuple(s[0], s[2])),
		map(cell_name, s => tuple(s, s))
	)), s => s[1]));

const sp = drop(reg(/^\s*/m));

const var_name = oneReg(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
const module_name = var_name;
const excel_fn_name = oneReg(/^([a-zA-Z]+(?:\.[a-zA-Z]+)?)/);
const nonneg = map(oneReg(/^(0|[1-9][0-9]*)/), s => parseInt(s)); // non-negative natural number
export const range_nonneg = map(seq(nonneg, sp, token(".."), sp, nonneg), s => tuple(s[0], s[4]))
	;

const rangePlus = choice(range_nonneg, map(nonneg, v => tuple(v, v)));
const var_with_props = map(seq(var_name, sp,
	optional([], map(seq(token("["), sp,
		rep(map(seq(oneReg(/^([xywh])/), sp, token(":"), sp, rangePlus, sp), v => ({ prop: v[0], v: v[4] })), { min: 1 }),
		token("]")), v => v[2]))), v => tuple(v[0], v[2]));

export const var_ref = tag("var_ref", var_with_props);
export const port_ref = tag("port_ref", map(seq(var_name, token("."), var_with_props), v => tuple(v[0], v[2])));


const arr_item = choice<R<typeof num> | R<typeof str>>(num, str);
export const arr = tag("arr", map(seq(
	token("{"),
	sp, arr_item, sp, rep(map(seq(oneReg(/^([,;])/), sp, arr_item, sp), v => tuple(v[0], v[2]))),
	token("}")
), s => [s[2], ...s[4]].flat()));




export const formulaLazy = () =>
	tag("formula", seq(lazy(termLazy), rep(map(seq(sp, op, sp, lazy(termLazy)), v => tuple(v[1], v[3])))));

export const bracketLazy = () =>
	tag("bracket", map(seq(token("("), sp, lazy(formulaLazy), sp, token(")")), v => v[2]));


export const fn_callLazy = () =>
	tag("fn_call",
		map(seq(excel_fn_name, sp, token("("), sp,
			optional(
				[],
				map(seq(lazy(formulaLazy), sp, rep(map(seq(token(","), sp, lazy(formulaLazy), sp), v => v[2]))), v => [v[0], ...v[2]])
			),
			token(")")), v => ({ name: v[0], args: v[4] })));

// FIXME:なんと汚い。
export const termLazy = () =>
	tag("term", choice<R<typeof num> | R<typeof str> | R<typeof cells_ref> | R<typeof var_ref> | R<typeof port_ref> | R<typeof arr> | R<ReturnType<typeof bracketLazy>> | R<ReturnType<typeof fn_callLazy>>>
		(num, str, cells_ref, var_ref, port_ref, arr, lazy(bracketLazy), lazy(fn_callLazy)));


const dec_var = var_with_props; // FIXME:使えるプロパティが違うが､まあいいか｡
const dec_vars = map(seq(dec_var, rep(map(seq(sp, dec_var), v => v[1]))), v => [v[0], ...v[1]]);
export const dec_in = tag("dec_in", map(seq(token("in"), sp, dec_vars), v => v[2]));
export const dec_out = tag("dec_out", map(seq(token("out"), sp, dec_vars), v => v[2]));
export const dec_tmp = tag("dec_tmp", map(seq(token("tmp"), sp, dec_vars), v => v[2]));
export const dec_eq = tag("dec_eq", map(seq(choice<R<typeof var_ref | typeof port_ref>>(var_ref, port_ref), sp, token("="), sp, formulaLazy), v => tuple(v[0], v[4])));
export const dec_new = tag("dec_new", map(seq(token("new"), sp, var_name, sp, token("::"), sp, module_name), v => tuple(v[2], v[6])));
export const declare = tag("declare",
	choice<R<typeof dec_in> | R<typeof dec_out> | R<typeof dec_tmp> | R<typeof dec_eq> | R<typeof dec_new>>
		(dec_in, dec_out, dec_tmp, dec_eq, dec_new));

export const module = tag("module", map(seq(token("module "), sp, module_name,
	rep(map(seq(sp, declare), v => v[1]))
), v => ({ name: v[2], decs: v[3] })));

export const root = tag("root", map(seq(sp, rep(map(seq(module, sp), v => v[0]))), v => v[1]));

export const sourceLazy = () => map(rep(map(choice(c_line, c_block, oneReg(/^(.|\n)/)), v => v == null ? " " : v)), s => s.join(""));
const c_line = reg_drop(/^\/\/[^\n]*(\n|$)/);
const c_block = reg_drop(/^\/\*.*?\*\//);