export function isChrome() {
	return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
}

// onWindowLoaded
export function onLoad(fn: () => any) {
	window.addEventListener("load", fn);
}
// onDomLoaded
export function onDomLoad(fn: () => any) {
	window.addEventListener("DOMContentLoaded", fn);
}
// onAnimationFrame
export function onAnim(fn: () => { continue: boolean }) {
	requestAnimationFrame(function tmp() {
		if (fn().continue) requestAnimationFrame(tmp);
	});
}

/** 静的型チェックでも実行時チェックでもエラーが出てくれるイイヤツ */
// eslint-disable-next-line no-unused-vars
export function neverHere(_: never) {
	throw "BUG!!!";
}
