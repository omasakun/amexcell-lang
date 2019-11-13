export function polyfill_flat() {
	//@ts-ignore
	if (!Array.prototype.flat) {
		//@ts-ignore
		Array.prototype.flat = function (depth) {
			var flattend = [];
			(function flat(array, depth) {
				for (let el of array) {
					if (Array.isArray(el) && depth > 0) {
						flat(el, depth - 1);
					} else {
						//@ts-ignore
						flattend.push(el);
					}
				}
			})(this, Math.floor(depth) || 1);
			return flattend;
		};
	}
}