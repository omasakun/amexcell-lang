import { Logger } from './simple-logger';
import { onClick, ge, loadFileAsText, downloadText } from "./browser-util";
import { isChrome, onLoad } from "./util";
import { compile } from './logic/index';

function isDebugMode() {
	const is_prod: string = "/* @echo is_prod */"; // preprocess
	return is_prod !== "true";
}
function showConsoleBanner() {
	const status = isDebugMode() ? " (debug)" : "";
	if (isChrome()) {
		console.log(
			"\n" +
			`%c %c Amexcell${status}\n` +
			"%c %c Made by omasakun in 2019\n" +
			"%c %c GitHub: https://github.com/omasakun/amexcell-lang\n" +
			"%c %c Author: https://github.com/omasakun\n" +
			"%c %c Enjoy!\n",
			"color: #130f40; background-color: #a799ef; line-height: 2;",
			"color: #ddd6ff; background-color: #524983; line-height: 2;",
			"color: #130f40; background-color: #a799ef; line-height: 1.5;",
			"",
			"color: #130f40; background-color: #a799ef; line-height: 1.5;",
			"",
			"color: #130f40; background-color: #a799ef; line-height: 1.5;",
			"",
			"color: #130f40; background-color: #a799ef; line-height: 1.5;",
			"font-weight: bold"
		);
	} else {
		console.log(
			"\n" +
			`┃ ### Amexcell${status} ### \n` +
			"┃ \n" +
			"┃ Made by omasakun in 2019\n" +
			"┃ GitHub: https://github.com/omasakun/amexcell-lang\n" +
			"┃ Author: https://github.com/omasakun\n" +
			"┃ Enjoy!\n"
		);
	}
}

showConsoleBanner();

onLoad(() => {
	const e = getDOM();
	initStartView(e);
	initIdeView(e);
	if (isDebugMode()) {
		e.start.begin.click();
		e.ide.code.value = [
			"(def sigma",
			"	(in nums w:3)",
			"	; 文法から変数と関数は区別できるため、変数と同じ名前を使ってもいい",
			"	(in num)",
			"	(out sum)",
			"	(= sum (sum nums num)))",
			"",
			"(def main",
			"	(in nums w:3)",
			"	(out outs h:2)",
			"	(new adder sigma)",
			"	(= adder.nums nums)",
			"	(= adder.num #\"Sheet1!A1\")",
			"	(= outs adder.sum))"
		].join("\n");
	}
});

type Elms = ReturnType<typeof getDOM>;
function getDOM() {
	return {
		start: {
			_: ge("start_view"),
			begin: ge("begin_using"),
			showLicense: ge("show_license_notice"),
			license: ge("license"),
		},
		ide: {
			_: ge("ide_view"),
			upload: ge("upload_code"),
			code: ge<HTMLTextAreaElement>("code_input"),
			compile: ge("begin_compilation"),
			log: ge("log_output"),
		},
	}
}

function initStartView(e: Elms) {
	const s = e.start;
	onClick(s.showLicense, () => {
		s.license.classList.toggle("-d-none");
	})
	onClick(s.begin, () => {
		s._.classList.add("-d-none");
		e.ide._.classList.remove("-d-none");
	});
}
function initIdeView(e: Elms) {
	const i = e.ide;
	const logger = new Logger(i.log);
	onClick(i.upload, () => {
		loadFileAsText()
			.then(text => compiler(text, logger))
			.catch(() => alert("canceled."));
	});
	onClick(i.compile, () => {
		const t = i.code.value;
		if (t.length == 0) {
			alert("ソースコードを入力してから Compile を押してください。（もしくは、ソースコードのファイルを upload してください。）");
		} else {
			compiler(t, logger);
		}
	});
}

function compiler(text: string, logger: Logger) {
	logger.clear();
	logger.append("##### Log ########");
	logger.append("===== Input  =====");
	logger.append(text);
	logger.append("===== EOF    =====\n");
	const result = compile(text, logger);
	logger.lineBreak();
	logger.append("==================");
	if (result.result) {
		logger.append("Compilation succeeded!");
		logger.append("===== Result =====");
		logger.append(result.result);
		logger.append("===== EOF    =====");
		if (isDebugMode()) return;
		let fileName = prompt("Save as...", "workbook.xml");
		if (fileName !== null) {
			downloadText(fileName, result.result, "application/xml");
		}
	} else {
		logger.append("Compilation failed...");
		alert("Compilation failed...");
	}
}

