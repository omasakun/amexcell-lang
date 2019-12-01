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
			"(def main",
			"	(out table w:9 h:9)",
			"	; モジュール内でのみ参照できる変数の定義",
			"	(var hori w:9)",
			"	(var vert h:9)",
			"	; 配列の一部への代入",
			"	(= (hori x:0..4) [1 2 3 4 5])",
			"	(= (hori x:5..8) [6 7 8 9])",
			"	(= (vert y:0..4) (transpose (hori x:0..4)))",
			"	(= (vert y:5..8) (transpose (hori x:5..8)))",
			"	(= table (* hori vert)))",
		].join("\n");
		// e.ide.code.value = [
		// 	"(def sigma",
		// 	"	(in nums w:3)",
		// 	"	; 文法から変数と関数は区別できるため、変数と同じ名前を使ってもいい",
		// 	"	(in num)",
		// 	"	(out sum)",
		// 	"	(= sum (sum nums num)))",
		// 	"",
		// 	"(def main",
		// 	"	(in nums w:3)",
		// 	"	(out outs h:2)",
		// 	"	(new adder sigma)",
		// 	"	(= adder.nums nums)",
		// 	"	(= adder.num #\"Sheet1!A1\")",
		// 	"	(= outs adder.sum))"
		// ].join("\n");
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
			exampleToggle: ge("toggle_examples"),
			examples: ge("examples"),
			example1: ge("example_1"),
			example2: ge("example_2"),
			example3: ge("example_3"),
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
	onClick(i.exampleToggle, () => {
		i.examples.classList.toggle("-d-none");
	});
	onClick(i.example1, setExample(e, 0));
	onClick(i.example2, setExample(e, 1));
	onClick(i.example3, setExample(e, 2));
}

function setExample(e: Elms, index: number) {
	const examples = [
		[
			'; ここはコメントです。',
			'; add という名前のモジュールを定義',
			'(def sigma',
			'	; num1 という入力を持つモジュールだと定義',
			'	(in num1)',
			'	(in num2)',
			'	(in num3)',
			'	(in num4)',
			'	; sumValue という出力を持つモジュールだと定義',
			'	(out sumValue)',
			'	; sumValue に、 num1 + num2 + num3 を代入',
			'	; Excel関数と同じく、自動的に再計算される',
			'	(= sumValue (+ num1 num2 num3)))',
			'',
			'; main という名前のモジュールが、最終的な入出力をする',
			'(def main',
			'	; 幅4セルの入力、numsを持つと定義',
			'	(in nums w:4)',
			'	; 高さ2セルの出力、outsを持つと定義',
			'	(out outs h:2)',
			'	; sigmaモジュールのインスタンス、sigmaを持つと定義',
			'	(new adder sigma)',
			'	; adderのnum1の入力に、numsの中でx座標が0のセルを代入',
			'	(= adder.num1 (nums x:0))',
			'	(= adder.num2 (nums x:1))',
			'	(= adder.num3 (nums x:2))',
			'	; Excel関数に、そのままの文字列で「A1」と出力される',
			'	(= adder.num4 #"Sheet1!A1")',
			'	(= (outs y:0) adder.sumValue)',
			'	(= (outs y:1) (outs y:0)))',
		], [
			'(def sigma',
			'	(in nums w:3)',
			'	; 文法から変数と関数は区別できるため、変数と同じ名前を使ってもいい',
			'	(in num)',
			'	(out sum)',
			'	(= sum (sum nums num)))',
			'',
			'(def main',
			'	(in nums w:3)',
			'	(out outs h:2)',
			'	(new adder sigma)',
			'	(= adder.nums nums)',
			'	(= adder.num #"Sheet1!A1")',
			'	(= outs adder.sum))',
		], [
			'(def main',
			'	(out table w:9 h:9)',
			'	; モジュール内でのみ参照できる変数の定義',
			'	(var hori w:9)',
			'	(var vert h:9)',
			'	; 配列の一部への代入',
			'	(= (hori x:0..4) [1 2 3 4 5])',
			'	(= (hori x:5..8) [6 7 8 9])',
			'	(= (vert y:0..4) (transpose (hori x:0..4)))',
			'	(= (vert y:5..8) (transpose (hori x:5..8)))',
			'	(= table (* hori vert)))',
		]].map(v => v.join("\n"));
	return () => e.ide.code.value = examples[index];
}

function compiler(text: string, logger: Logger) {
	logger.clear();
	logger.append("##### Log ########");
	logger.append(new Date().toISOString());
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
		// if (isDebugMode()) return;
		let fileName = prompt("Save as...", "workbook.xml");
		if (fileName !== null) {
			downloadText(fileName, result.result, "application/xml");
		}
	} else {
		logger.append("Compilation failed...");
		alert("Compilation failed...");
	}
}

