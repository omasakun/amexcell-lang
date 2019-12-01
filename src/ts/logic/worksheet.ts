import { makeArr, neverHere } from "../util";
import { packBin } from "./bin-packing";

// https://support.office.com/en-us/article/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3
const SHEET_MAX_WIDTH = 256; // Excel2007: 16384;
const SHEET_MAX_HEIGHT = 65536; // Excel2007: 1048576;
const CELL_CHAR_LIMIT = 32767; // Excel2007: 32767;

export interface Size2D {
	w: number
	h: number
}
export interface Pos2D {
	x: number
	y: number
}
export interface Area { x: number, y: number, w?: number, h?: number }
export class CellsView {
	constructor(
		private cells: Cells,
		private area: Area,
	) {
		// Do nothing
	}
	setFormula(v: string) {
		const area = this.area;
		this.cells.values.push({ area, v });
	}
	getRefString(): string {
		if (!this.cells.position)
			throw "セルへの参照文字列を取得する前に、セルの配置を行ってください";
		const x = this.cells.position.x + this.area.x;
		const y = this.cells.position.y + this.area.y;
		const w = this.area.w ? this.area.w : this.cells.size.w;
		const h = this.area.h ? this.area.h : this.cells.size.h;
		let result = "";
		result += "R" + (y + 1) + "C" + (x + 1);
		if (w !== 1 || h !== 1) {
			result += ":";
			result += "R" + (y + h) + "C" + (x + w);
		}
		return result;
	}
}
export type CellKind = "in" | "out" | "tmp" | "main-in" | "main-out";
export class Cells {
	readonly size: Size2D
	position: Pos2D | undefined = undefined
	values: { area: Area, v: string }[] = []
	kind: CellKind;
	label: string
	constructor(size: Size2D, kind: CellKind, label = "") {
		this.size = size;
		this.kind = kind;
		this.label = label;
	}
	getView(area: Area = { x: 0, y: 0 }): CellsView {
		return new CellsView(this, area);
	}
	/** セルへの二重代入のないことを確認する */
	verify(): void {
		const { w, h } = this.size, label = this.label;
		const usageMap = makeArr(w, () => makeArr(h, () => false));
		for (let i = 0; i < this.values.length; i++) {
			const { area } = this.values[i];
			if (area.x < 0 || area.x >= w || (area.w && area.x + area.w - 1 > w)) throw `領域外への参照 x座標。Label: ${label}`;
			if (area.y < 0 || area.y >= h || (area.h && area.y + area.h - 1 > h)) throw `領域外への参照 x座標。Label: ${label}`;
			if (area.w && area.w <= 0) throw `非正の幅のセル。Label: ${label}`;
			if (area.h && area.h <= 0) throw `非正の高さのセル。Label: ${label}`;
			const maxX = area.w ? area.x + area.w - 1 : area.x + w - 1;
			const maxY = area.h ? area.y + area.h - 1 : area.y + h - 1;
			for (let x = area.x; x <= maxX; x++) {
				for (let y = area.y; y <= maxY; y++) {
					if (usageMap[x][y]) throw `セルへの二重代入。(${x}, ${y}) Label: ${label}`;
					usageMap[x][y] = true;
				}
			}
		}
	}
	// デフォルトの toString のほうが情報量が多いため、上書きはしない。
	toStr(): string {
		return [
			this.kind.padEnd(3, " "),
			(this.size.w + "x" + this.size.h).padEnd(7, " "),
			(this.position ? (this.position.x + "," + this.position.y) : "nopos").padEnd(7, " "),
			this.label,
			this.values.map(v =>
				v.area.x + "," +
				v.area.y + ":" +
				(v.area.w ? v.area.w : "*") + "x" +
				(v.area.h ? v.area.h : "*")).join(" "),
		].join(" ");
	}
}
export class Sheet {
	private cells: Cells[] = [];
	private isArranged = false;
	private size: { w: number, h: number } | undefined = undefined;
	alloc(size: Size2D, kind: CellKind, label = ""): Cells {
		if (this.isArranged)
			throw "セルの配置処理が完了したあとからセルを追加することは、実装が面倒なので許可してません。";
		const c = new Cells(size, kind, label);
		this.cells.push(c);
		return c;
	}
	arrange() {
		if (this.isArranged) return;
		this.isArranged = true;
		const arrangement = packBin(
			this.cells.map(c => ({ c: c, w: c.size.w, h: c.size.h })),
			SHEET_MAX_WIDTH, "height-sort");
		if (arrangement.h > SHEET_MAX_HEIGHT)
			throw "セルの配置作業を行ったところ、必要となるシートの高さがエクセルで許可されている高さを超えました。";
		if (arrangement.w > SHEET_MAX_WIDTH)
			throw "セルの配置作業を行ったところ、必要となるシートの幅がエクセルで許可されている幅を超えました。";
		arrangement.bins.forEach(c => {
			c.bin.c.position = { x: c.x, y: c.y };
		});
		this.size = { w: arrangement.w, h: arrangement.h };
	}
	getSize() {
		return this.size;
	}
	/** セルへの二重代入がないことを確かめる */
	verify() {
		this.cells.forEach(c => c.verify());
	}
	cells2str(): string {
		return this.cells.map(c => c.toStr()).join("\n");
	}
	export(): string {
		if (!this.isArranged)
			throw "セルの配置処理を行ってからエクスポートしてください。";
		const list = this.cells.flatMap(c => {
			return c.values.flatMap(v => {
				const x = c.position!.x + v.area.x;
				const y = c.position!.y + v.area.y;
				const w = v.area.w ? v.area.w : c.size.w;
				const h = v.area.h ? v.area.h : c.size.h;
				const r: { x: number, y: number, kind: CellKind, additional?: { w: number, h: number, v: string, label: string } }[]
					= [{ x, y, kind: c.kind, additional: { w, h, v: v.v, label: c.label } }];
				for (let dx = 0; dx < w; dx++) {
					for (let dy = 0; dy < h; dy++) {
						if (dx !== 0 || dy !== 0)
							r.push({ x: x + dx, y: y + dy, kind: c.kind });
					}
				}
				return r;
			});
		}).sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
		console.log(list);
		let rows: string[] = [];
		let cells: string[] = [], prevY = -1;
		list.forEach(l => {
			if (prevY !== l.y) {
				if (cells.length > 0) {
					rows.push(generateRow(prevY + 1, cells));
					cells = [];
				}
				prevY = l.y;
			}
			if (l.additional) {
				cells.push(generateFormulaCell(l.x + 1, l.additional, l.additional.v, l.additional.label, l.kind));
			} else {
				cells.push(generateBlankCell(l.x + 1, l.kind));
			}
		});
		if (cells.length > 0) {
			rows.push(generateRow(prevY + 1, cells));
			cells = [];
		}
		return generateSheet("amexcell-result", rows.join("\n"));
	}
}

function escapeXml(str: string) {
	return str
		.replace("&", "&amp;")
		.replace("<", "&lt;")
		.replace(">", "&gt;")
		.replace('"', "&quot;")
		.replace("'", "&apos;");
}
function generateSheet(sheetName: string, tableBody: string) {
	return [
		`<?xml version="1.0"?>`,
		`<?mso-application progid="Excel.Sheet"?>`,
		`<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" `,
		`	xmlns:o="urn:schemas-microsoft-com:office:office" `,
		`	xmlns:x="urn:schemas-microsoft-com:office:excel" `,
		`	xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" `,
		`	xmlns:html="http://www.w3.org/TR/REC-html40">`,
		`	<Styles>`,
		`		<Style ss:ID="s1" ss:Name="Input">`,
		`			<Interior ss:Color="#D0DEC8" ss:Pattern="Solid"/>`,
		`		</Style>`,
		`		<Style ss:ID="s2" ss:Name="Output">`,
		`			<Interior ss:Color="#CCD9E4" ss:Pattern="Solid"/>`,
		`		</Style>`,
		`		<Style ss:ID="s3" ss:Name="Temp">`,
		`			<Interior ss:Color="#DBDBDB" ss:Pattern="Solid"/>`,
		`		</Style>`,
		`		<Style ss:ID="s4" ss:Name="Main Input">`,
		`			<Interior ss:Color="#C6E0B4" ss:Pattern="Solid"/>`,
		`		</Style>`,
		`		<Style ss:ID="s5" ss:Name="Main Output">`,
		`			<Interior ss:Color="#BDD7EE" ss:Pattern="Solid"/>`,
		`		</Style>`,
		`	</Styles>`,
		`	<Worksheet ss:Name="${sheetName}">`,
		`		<Table>`,
		tableBody.split("\n").map(v => "\t\t\t" + v).join("\n"),
		`		</Table>`,
		`	</Worksheet>`,
		`</Workbook>`,
	].join("\n");
}
function generateRow(index: number, cells: string[]) {
	return [`<Row ss:Index="${index.toString()}">`, ...cells.map(v => "\t" + v), "</Row>"].join("\n");
}
function generateFormulaCell(index: number, range: { w: number, h: number }, formula: string, label: string, kind: CellKind) {
	const w = range.w, h = range.h;
	const rangeRef = `RC:R${h === 1 ? "" : "[" + (h - 1) + "]"}C${w === 1 ? "" : "[" + (w - 1) + "]"}`;
	const styleID = kind2styleID(kind);

	return `<Cell ss:Index="${index.toString()}" ss:ArrayRange="${rangeRef}" ss:Formula="${escapeXml(formula)}" ss:StyleID="${styleID}"><Comment><ss:Data xmlns="http://www.w3.org/TR/REC-html40">${escapeXml(label)}</ss:Data></Comment></Cell>`;
}
function generateBlankCell(index: number, kind: CellKind) {
	const styleID = kind2styleID(kind);
	return `<Cell ss:Index="${index.toString()}" ss:StyleID="${styleID}"></Cell>`;
}
function kind2styleID(kind: CellKind): string {
	return kind === "in" ? "s1"
		: kind === "out" ? "s2"
			: kind === "tmp" ? "s3"
				: kind === "main-in" ? "s4"
					: kind === "main-out" ? "s5"
						: neverHere(kind);
}