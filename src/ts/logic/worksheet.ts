import { makeArr } from "../util";
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
		throw "Not implemented."; // TODO: Implement
	}
}
export class Cells {
	readonly size: Size2D
	position: Pos2D | undefined = undefined
	values: { area: Area, v: string }[] = []
	label: string
	constructor(size: Size2D, label = "") {
		this.size = size;
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
}
export class Sheet {
	private cells: Cells[] = [];
	private isArranged = false;
	private size: { w: number, h: number } | undefined = undefined;
	alloc(size: Size2D, label = ""): Cells {
		if (this.isArranged)
			throw "セルの配置処理が完了したあとからセルを追加することは、実装が面倒なので許可してません。";
		const c = new Cells(size, label);
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
	export(): string {
		if (!this.isArranged)
			throw "セルの配置処理を行ってからエクスポートしてください。";
		return "Exporting worksheet is not implemented...";
	}
}