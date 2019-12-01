import { NumExpr, StrExpr, RawExpr, ArrExpr, Module as ModuleProto, VarExpr as VarExprProto, PortExpr as PortExprProto, Expr as ExprProto, proto2str } from "./proto";
import { Size2D, CellsView as CV, Cells, Sheet } from "./worksheet";
import { neverHere } from "../util";

interface Module {
	instanceNamePath: string[]
	moduleName: string
	in: Map<string, Cells>
	out: Map<string, Cells>
	var: Map<string, Cells>
	modules: Map<string, Module>
	eqs: Equation[]
}
interface Equation { cView: CV, expr: Expr }
type Expr = NumExpr | StrExpr | RawExpr | ArrExpr | FuncExpr | RefExpr;
interface FuncExpr { t: "func", fn: string, args: Expr[] }
interface RefExpr { t: "ref", cView: CV }

export function proto2ins(sheet: Sheet, map: Map<string, ModuleProto>): Module {
	const entryPoint = map.get("main");
	if (!entryPoint) throw `mainモジュールが定義されていません。プログラムの入出力はmainモジュールから行われます。`;
	return makeModule(sheet, map, "main", ["main"]);
}
export function ins2moduleTree(m: Module) {
	return m.moduleName + (
		m.modules.size === 0 ? "" :
			"(" + Array.from(m.modules.values()).map(m => ins2moduleTree(m)).join(" ") + ")"
	);
}
function makeModule(sheet: Sheet, map: Map<string, ModuleProto>, mName: string, iPath: string[]): Module {
	const proto = map.get(mName);
	if (!proto) throw `定義されていないモジュールの実体を作ろうとしています。Name: ${mName}。`;
	const result: Module = { in: new Map(), out: new Map(), var: new Map(), modules: new Map(), eqs: [], moduleName: mName, instanceNamePath: iPath };
	proto.in.forEach(v => result.in.set(v.name, sheet.alloc(v.size, mName === "main" ? "main-in" : "in", iPath.join(".") + ".in." + v.name)));
	proto.out.forEach(v => result.out.set(v.name, sheet.alloc(v.size, mName === "main" ? "main-out" : "out", iPath.join(".") + ".out." + v.name)));
	proto.var.forEach(v => result.var.set(v.name, sheet.alloc(v.size, "tmp", iPath.join(".") + ".var." + v.name)));
	proto.modules.forEach((v, k) => result.modules.set(k, makeModule(sheet, map, v, iPath.concat(k))));
	proto.eqs.forEach(eq => {
		result.eqs.push({
			cView: resolveRef(result, eq.cell, "left-side"),
			expr: resolveExpr(result, eq.expr)
		});
		// セルへの代入操作は行わない。というのも、Exprのテキスト表現はセルの配置完了後に確定するため。
	});
	return result;
}
function resolveRef(module: Module, ref: VarExprProto | PortExprProto, type: "left-side" | "right-side"): CV {
	if (ref.t === "port") {
		const m = module.modules.get(ref.port.mName);
		if (!m) throw `存在しないモジュールインスタンスへの参照です。Expr: ${proto2str(ref)}`;
		const p = (type === "left-side" ? m.in : m.out).get(ref.port.port);
		if (!p) throw `存在しないモジュールインスタンスの変数への参照です。Expr: ${proto2str(ref)}`;
		return p.getView(ref.port);
	} else if (ref.t === "var") {
		const v1 = module.var.get(ref.cell.name);
		const v2 = module.in.get(ref.cell.name);
		const v3 = module.out.get(ref.cell.name);
		const v = v1 || v2 || v3;
		if (!v) throw `存在しない変数への参照です。Expr: ${proto2str(ref)}`;
		return v.getView(ref.cell);
	} else throw neverHere(ref);
}
function resolveExpr(module: Module, p: ExprProto): Expr {
	if (p.t === "num" || p.t === "arr" || p.t === "str" || p.t === "raw") return p;
	if (p.t === "var" || p.t === "port") return { t: "ref", cView: resolveRef(module, p, "right-side") };
	if (p.t === "func") return { t: "func", fn: p.fn, args: p.args.map(v => resolveExpr(module, v)) };
	throw neverHere(p);
}

/** 各セルに数式を代入する */
export function assignFormulas(m: Module) {
	m.eqs.forEach(e => {
		e.cView.setFormula("=" + expr2formula(e.expr));
	});
	if (m.moduleName === "main") {
		m.in.forEach(c => {
			c.getView().setFormula(""); // placeholder
		});
	}
	m.modules.forEach(m => assignFormulas(m));
}
export function expr2formula(e: Expr): string {
	if (e.t === "num") return e.v.toString();
	if (e.t === "str") return JSON.stringify(e.v).replace('\\"', '""');
	if (e.t === "raw") return e.v;
	if (e.t === "ref") return e.cView.getRefString();
	if (e.t === "arr") return arr2formula(e);
	if (e.t === "func") return func2formula(e);
	throw neverHere(e);
}
function arr2formula(a: ArrExpr): string {
	return "{" + a.v.map(v => {
		if (Array.isArray(v))
			return v.map(v => expr2formula(v)).join(",");
		return expr2formula(v);
	}).join(";") + "}";
}
function func2formula(f: FuncExpr): string {
	const operators = ["+", "-", "*", "/", "%", "^", "=", ">", "<", ">=", "<=", "<>", "&"];
	if (operators.find(v => v === f.fn)) {
		return "(" + f.args.map(v => expr2formula(v)).join(f.fn) + ")";
	} else {
		return f.fn + "(" + f.args.map(v => expr2formula(v)).join(",") + ")";
	}
}