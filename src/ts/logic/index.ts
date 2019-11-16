import { Sheet } from './worksheet';
import { Logger } from "../simple-logger";
import { str2lit, lit2str } from "./literal";
import { lit2proto, proto2str } from "./proto";
import { proto2ins, ins2moduleTree, assignFormulas } from './instance';
export interface CompileResult {
	result?: string
}

export function compile(text: string, logger: Logger): CompileResult {
	try {
		// 1. テキストを解析して、リテラルツリーへ変換する
		const lit = str2lit(text);
		logger.append("[S-Expr in readable format]");
		logger.append(lit.map(v => lit2str(v)).join("\n"));
		logger.lineBreak();

		// 2. リテラルツリーから、モジュールのプロトタイプを作成する
		const proto = lit2proto(lit);
		logger.append("[Module Prototypes]");
		logger.append(Array.from(proto.values()).map(v => proto2str(v)).join("\n"));
		logger.lineBreak();

		// 3. ワークシートを作る
		const sheet = new Sheet();

		// 4. モジュールのプロトタイプから、モジュールの実体のツリーを作り、仮想セルを割り当てる
		const instance = proto2ins(sheet, proto);
		logger.append("[Module Instance tree]");
		logger.append(ins2moduleTree(instance));
		logger.lineBreak();

		// 5. ワークシートに割り当てられた仮想セルに、実際の座標を割り当てる
		sheet.arrange();
		const sheetSize = sheet.getSize();
		if (!sheetSize) throw "BUG: シートの大きさの取得に失敗。ありえない。";
		logger.append("[Sheet size]");
		logger.append(sheetSize.w + "x" + sheetSize.h);
		logger.lineBreak();


		// 6. 仮想セルに数式の文字列を割り当てる
		assignFormulas(instance);

		// 7. 仮想セルの整合性確認をする
		sheet.verify();

		// 8. ワークシートとして出力する
		const result = sheet.export();

		return { result };
	} catch (e) {
		logger.append("[ERROR]");
		logger.append(e);
	}
	return { result: undefined };
}
window["p"] = str2lit;
