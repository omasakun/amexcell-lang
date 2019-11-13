import { Logger } from "../simple-logger";
export interface CompileResult {
	result?: string
}

export function compile(text: string, logger: Logger): CompileResult {
	logger.append("コンパイルログとか");
	return {
		result: "hogehoge"
	};
}