/* eslint-disable */
const bs = require("browser-sync").create()
const fiber = require("fibers")
const fs = require("fs")
const closure_compiler = require("google-closure-compiler").gulp()
const { dest, parallel, series, src, watch } = require("gulp")
const babel = require("gulp-babel")
const cache = require("gulp-cache")
const cached = require("gulp-cached")
const clean_css = require("gulp-clean-css")
const favicon = require("gulp-favicons")
const image_min = require("gulp-imagemin")
const intermediate = require("gulp-intermediate")
// const inject = require("gulp-inject")
const html_min = require("gulp-htmlmin")
const notify = require("gulp-notify")
const plumber = require("gulp-plumber")
const postcss = require("gulp-postcss")
const preprocess = require("gulp-preprocess") // https://www.npmjs.com/package/preprocess
const pug = require("gulp-pug")
const ts = require("gulp-typescript").createProject("tsconfig.json")
const rename = require("gulp-rename")
const sass = require("gulp-sass")
const sourcemaps = require("gulp-sourcemaps")
// const rollup_stream = require("rollup-stream")
const rollup = require("rollup").rollup
const noop = require("through2").obj
const trash = require("trash")
sass.compiler = require("sass")

const browser_list = [
	"ie >= 10",
	"ios >= 8",
	"android >= 4.0",
	"> 3% in JP"
]

const rollup_plugins = [
	require("rollup-plugin-node-resolve")(),
	require("rollup-plugin-commonjs")(),
	require("rollup-plugin-sourcemaps")(),
]
const postcss_plugins = [
	require("postcss-assets")({ loadPaths: ["src/assets"] }), // TODO: optimizeされたリソースを使うべきかも
	require("css-declaration-sorter")({ order: "smacss" }),
	require("autoprefixer")({
		overrideBrowserslist: browser_list,
		cascade: false
	}),
]
const error2notify = () => plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
const bs_update = bs.stream
const only_changed = (cacheName) => cached(cacheName, { optimizeMemory: true })
const prod_only = (stream) => is_prod ? stream : noop() // 一部処理は、開発時には行わず、製品ビルドでのみ行う

const is_prod = process.argv.includes("--prod")
const dest_dir = is_prod ? "docs" : ".tmp/dest" // output folder
const bs_port = 5000 // BrowserSync port number

function get_configs() { // for preprocess/pug
	const package = JSON.parse(fs.readFileSync("package.json").toString())
	const is_debug = !is_prod
	const version = package.version || "0.0.0"
	return {
		version,
		is_debug,
		is_prod,
	}
}
function task_assets() {
	return src(["src/assets/**/*", "!src/assets/favicon.*"], { base: "src/assets" })
		.pipe(error2notify())
		.pipe(only_changed("assets"))
		.pipe(prod_only(image_min()))
		.pipe(dest(dest_dir))
		.pipe(bs_update())
}
function task_favicon() {
	return src("src/assets/favicon.*")
		.pipe(error2notify())
		.pipe(only_changed("favicon"))
		.pipe(favicon({
			appName: "Amexcell",
			appShortName: "Amexcell",
			appDescription: "An programming language for creating programs by combining Excel functions.",
			developerName: "omasakun",
			developerURL: "https://github.com/omasakun",
			background: "#ffffff",
			path: "/favicon/",
			url: "https://omasakun.github.io/amexcell-lang",
			display: "standalone",
			orientation: "portrait",
			scope: "/",
			start_url: "/",
			version: 1.0,
			logging: false,
			html: "index.html",
			pipeHTML: true,
			replace: true,
		}))
		.pipe(dest(dest_dir + "/favicon"))
		.pipe(bs_update())
}
function task_pug() {
	return src(["src/pug/**/*.pug", "!**/_*.pug"], { base: "src/pug" })
		.pipe(error2notify())
		.pipe(pug({ data: get_configs() }))
		.pipe(prod_only(html_min({
			collapseWhitespace: true,
			caseSensitive: true
		})))
		.pipe(dest(dest_dir))
		.pipe(bs_update())
}
function task_sass() {
	return src("src/sass/**/*.sass", { base: "src/sass" })
		.pipe(error2notify())
		.pipe(sass({ outputStyle: "compressed", fiber }))
		.pipe(postcss(postcss_plugins))
		.pipe(clean_css())
		.pipe(dest(dest_dir))
		.pipe(bs_update())
}
var rollup_cache
function task_ts() {
	return src(".tmp/ts/**/*.js", { base: ".tmp/ts" }) // src("src/ts/**/*.ts", { base: "src/ts" })
		.pipe(error2notify())
		.pipe(sourcemaps.init({ loadMaps: true }))
		//.pipe(sourcemaps.init())
		// .pipe(ts()).js
		.pipe(preprocess({ context: get_configs() }))
		.pipe(prod_only(cache(
			babel({
				presets: [["@babel/preset-env", { "targets": { "browsers": browser_list } }]]
			}),
			{ name: "babel" }
		)))
		.pipe(sourcemaps.write())
		.pipe(intermediate({ output: "bundle" }, (tempDir, done) => {
			rollup({
				input: `${tempDir}/index.js`,
				treeshake: true,
				plugins: rollup_plugins,
				cache: rollup_cache
			}).then(bundle => {
				return bundle.write({
					file: `${tempDir}/bundle/index.js`,
					format: "iife",
					name: "index_js",
					sourcemap: "inline"
				})
			}).then(() => done())
		}))
		.pipe(prod_only(closure_compiler({
			compilation_level: "SIMPLE",
			"language_in": "ECMASCRIPT_2015",
			"language_out": "ECMASCRIPT_2015",
		})))
		.pipe(rename("index.js"))
		.pipe(dest(dest_dir))
		.pipe(bs_update())
}
function task_bs_start(done) {
	bs.init({
		// https: true,
		// notify: false,
		server: dest_dir,
		port: bs_port
	})
	done()
}
function task_clean() {
	// return trash([dest_dir, ".tmp"])
	return trash([dest_dir, ".tmp/dest"])
}
function task_watch(done) {
	watch("src/pug/**/*", task_pug)
	watch("src/sass/**/*", task_sass)
	// watch("src/ts/**/*", task_ts)
	watch(".tmp/ts/**/*", task_ts)
	watch("src/assets/**/*", parallel(task_assets, /* task_favicon, */ task_sass))
	done()
}
const task_build = parallel(task_assets, /* task_favicon, */ task_pug, task_sass, task_ts)
const task_serve = series(task_clean, task_build, parallel(task_bs_start, task_watch))

exports.clean = task_clean
exports.watch = task_watch
exports.build = task_build
exports.default = exports.serve = task_serve
