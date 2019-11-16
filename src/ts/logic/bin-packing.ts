import { neverHere } from "../util";

export interface Bin2D {
	w: number
	h: number
}
export interface BinPackResult<T extends Bin2D> {
	bins: {
		bin: T
		x: number
		y: number
	}[]
	w: number
	h: number
}
interface Area { x: number, y: number, w: number, h: number }
export type PackingStrategy = "height-sort";
export function packBin<T extends Bin2D>(bins: T[], maxW: number, strategy: PackingStrategy): BinPackResult<T> {
	if (strategy === "height-sort") {
		// 高さの高いものから詰めていく。
		let areas: Area[] = [{ x: 0, y: 0, w: maxW, h: Infinity }]; // 高さの低いものから、残っているスペースのリスト
		let w = 0, h = 0;
		const resultBins = bins.sort((a, b) => b.h - a.h).map(bin => {
			const addTo = areas.findIndex(k => k.h >= bin.h && k.w >= bin.w);
			if (addTo < 0) throw "敷き詰めに何故か失敗しました。";
			const a = areas.splice(addTo, 1)[0];
			if (a.h > bin.h)
				areas.push({ x: a.x, y: a.y + bin.h, w: a.w, h: a.h - bin.h });
			if (a.w > bin.w)
				areas.push({ x: a.x + bin.w, y: a.y, w: a.w - bin.w, h: bin.h });
			areas = areas.sort((a, b) => a.h - b.h);
			w = Math.max(w, a.x + bin.w);
			h = Math.max(h, a.y + bin.h);
			return { bin, x: a.x, y: a.y };
		});
		return { bins: resultBins, w, h };
	} else throw neverHere(strategy);
}