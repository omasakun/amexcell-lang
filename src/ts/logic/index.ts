import { Logger } from "../simple-logger";
import { parser } from "./parser_sexpr";
export interface CompileResult {
	result?: string
}

export function compile(text: string, logger: Logger): CompileResult {
	logger.append("コンパイルログとか");
	return {
		result: "hogehoge"
	};
}
window["p"] = parser;