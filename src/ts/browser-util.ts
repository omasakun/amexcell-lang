// ge geqa geq ce cLI remC addC remAll onClick onLoad

// getElementById
export function ge<T extends HTMLElement = HTMLElement>(id: string) {
	return document.getElementById(id) as T;
}
// getAllElementsByQuery
export function geqa(selectors: string) {
	return Array.from(document.querySelectorAll(selectors))
}
// getElementByQuery
export function geq(selectors: string) {
	return document.querySelector(selectors)
}
// createElement
export function ce<K extends keyof HTMLElementTagNameMap>(tagName: K, classes: string[] = [], children: HTMLElement[] = []): HTMLElementTagNameMap[K] {
	const e = document.createElement(tagName);
	classes.forEach(_ => addC(e, _));
	children.forEach(_ => e.appendChild(_));
	return e;
}
// createLiElement
export function cLI(innerText: string, classes: string[], id?: string, onClickFn?: () => any) {
	const li = ce("li");
	li.innerText = innerText;
	classes.forEach(_ => addC(li, _));
	if (id) li.id = id;
	if (onClickFn) onClick(li, onClickFn);
	return li;
}
// removeClassFromElement
export function remC(elm: HTMLElement, cls: string) {
	elm.classList.remove(cls);
}
// addClassToElement
export function addC(elm: HTMLElement, cls: string) {
	elm.classList.add(cls);
}
// setClassToElement
export function setC(elm: HTMLElement, cls: string, enable: boolean) {
	if (enable) elm.classList.add(cls);
	else elm.classList.remove(cls);
}
// removeAllChildren
export function remAll(elm: HTMLElement) {
	while (elm.firstChild)
		elm.removeChild(elm.firstChild);
}
// addOnClickEventListener
export function onClick(elm: HTMLElement, fn: (ev: HTMLElementEventMap["click"]) => any) {
	elm.addEventListener("click", fn);
}

export function animateHeight(e: HTMLElement, do_: () => any, noTransition = false) {

	const oldWidth = e.scrollWidth;
	const oldHeight = e.scrollHeight;
	const oldMaxWidth = getComputedStyle(e).maxWidth;
	e.style.transition = "none";
	e.style.height = "";
	e.style.width = "";
	e.style.maxWidth = "";
	do_();
	const newWidth = e.scrollWidth;
	const newHeight = e.scrollHeight;

	// console.log(e, [oldWidth, oldHeight, oldMaxWidth], [newWidth, newHeight, newMaxWidth], noTransition);
	if (noTransition) {
		e.style.transition = "";
	} else {
		// const requestAnimationFrame = (fn) => setTimeout(fn, 1000);
		requestAnimationFrame(() => {
			e.style.maxWidth = oldMaxWidth;
			e.style.width = oldWidth + "px";
			e.style.height = oldHeight + "px";
			requestAnimationFrame(() => {
				e.style.transition = "";
				requestAnimationFrame(() => {
					e.style.width = newWidth + "px";
					e.style.height = newHeight + "px";
					e.style.maxWidth = "";
					const resetter = () => {
						e.style.height = "";
						e.style.width = "";
					};
					e.addEventListener("transitionend", resetter);
					e.addEventListener("transitioncancel", function foo() {
						e.removeEventListener("transitionend", resetter);
						e.removeEventListener("transitioncancel", foo);
					});
				});
			});
		});
	}
}

export function downloadText(fileName: string, contents: string, type = "text/plain") {
	const a = ce("a");
	a.href = URL.createObjectURL(new Blob([contents], { type }));
	a.download = fileName;
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

export function loadFileAsText(): Promise<string> {
	return new Promise((res, rej) => {
		const input = ce("input");
		input.type = "file";
		input.addEventListener("change", e => {
			// @ts-ignore				
			const file = e.target.files[0];
			if (!file) rej();
			const reader = new FileReader();
			reader.onload = e => res(reader.result as string);
			reader.readAsText(file);
		});
		document.body.appendChild(input);
		input.click();
		document.body.removeChild(input);
	});
}
