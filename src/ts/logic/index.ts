import { Logger } from "../simple-logger";
import { parseIndents, parseVarDefs, parseModule } from "./grammar";
export interface CompileResult {
	result?: string
}

export function compile(text: string, logger: Logger): CompileResult {
	logger.append("コンパイルログとか");
	return {
		result: "hogehoge"
	};
}

window["ho"] = parseIndents;
window["v"] = parseModule;
