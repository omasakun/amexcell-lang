module.exports = {
	"rootDir": "src/ts",
	"moduleFileExtensions": ["ts", "js"],
	"transform": {
		"^.+\\.tsx?$": "ts-jest",
	},
	"globals": {
		"ts-jest": {
			"diagnostics": true,
		}
	}
}
