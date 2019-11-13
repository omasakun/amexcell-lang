export class Logger {
	constructor(
		private elm: HTMLElement
	) {
		elm.textContent = "";
	}
	clear() {
		this.elm.textContent = "";
	}
	append(text: string, appendLineBreak = true) {
		this.elm.textContent += text + (appendLineBreak ? "\n" : "");
	}
	lineBreak() {
		this.elm.textContent += "\n";
	}
	set(text: string) {
		this.elm.textContent = text;
	}
}