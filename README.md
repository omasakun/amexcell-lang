# Amexcell

An programming language for creating programs by combining Excel functions.

<p align="center">
	<a href="https://omasakun.github.io/amexcell-lang"><b>Try Now!</b></a>
</p>

<!--
// TODO: Add screenshots
<p align="center">
	<img alt="Preview" src="preview.png">
</p>
-->


## Output format

出力されるxmlファイルは、一つのワークブックとしてExcelで開くことができます。  
中には、 `generated` という名前のシートがあります。
緑色のセルは入力のセル（mainモジュールの入力たち）を表し、青色のセルは出力のセル（mainモジュールの出力たち）を表します。  
入力と出力のセルにはコメントが付いており、どの名前の入出力と対応しているかがわかるようになっています。

## Example Programs
### Example1 総和

Source:
```
// ここはコメントです。
/* ここもコメントです。
	 ここもコメントです。*/
def sigma                       // add という名前のモジュールを定義する。
	in  num1 num2                 // num1, num2 という名前の入力を持つモジュールだと定義
	in  num3                      // in は2つ以上書くこともできる
	out sumValue                  // sumValue という名前の出力をするモジュールだと定義
	sumValue = (+ num1 num2 num3) // Excel関数のように、右辺の値が書き換わったら左辺の値が書き換わる
                            	  // 上の行はExcel関数を使って `sumValue = sum(num1, num2, num3)` とも書ける
def main                        // main という名前を持ったモジュールが、プログラム全体の最終的な入出力をする
	in  nums[w:3]                 // 幅3の入力をnumsという名前で定義
	out outs[h:2]                 // 高さ2の出力をsumという名前で定義
	new adder :: sigma            // adder という名前で、sigmaモジュールのインスタンスを作成
	adder.num1 = nums[x:0]        // adderのnum1の入力に、numsのx座標が0番目のセルの値を入れる
	adder.num2 = nums[x:1]        // Excel関数のように、右辺の値が書き換わると左辺の値も書き換わる
	adder.num3 = nums[x:2]
	outs[y:0] = adder.sumValue
	outs[y:1] = outs[y:0]
```

Result:
```
A1: コメント「nums[x:0]」がついた緑色のセル
B1: コメント「nums[x:1]」がついた緑色のセル
C1: コメント「nums[x:2]」がついた緑色のセル
A2: 「=A1+B1+C1」
A3: コメント「outs[y:0]」がついた「=A2」な青色のセル
A4: コメント「outs[y:1]」がついた「=A3」な青色のセル
```

### Example2 総和

Example1と同じ動作をするプログラム

Source:
```
def sigma
	in nums[w:3]        // タブインデントは必須。スペースでインデントは認めない。
	out sum
	sum = (sum nums)

def main
	in  nums[w:3]
	out outs[h:2]
	new adder :: sigma
	adder.nums = nums
	outs {=} adder.sum  // {=} を使って、CSE数式を入れる
```

### Example3 かけ算九九表

```
def main
	out table[w:9 h:9]
	var hori[w:9] vert[h:9]      // 一時変数の定義
	hori[x:0..4] {=} {1,2,3,4,5} // 配列の一部にのみ代入
	hori[x:5..8] {=} {6,7,8,9}
	vert[y:0..4] {=} (transpose hori[0..4])
	vert[y:5..8] {=} (transpose hori[5..8])
	table {=} hori * vert
```

## Repositories

- [GitHub](https://github.com/omasakun/amexcell-lang)
- [GitLab](https://gitlab.com/omasakun/amexcell-lang)

## Directory Structure

- [.vscode](.vscode) : [VS Code](https://code.visualstudio.com/) settings
- [src](src) : Source code
- [docs](docs) : Compiled files

## How to compile

1. `pnpm install` or `npm install` : Install necessary npm packages
2. `npm run tsc` : Compile typescript files
3. `npm run serve` : Compile files & Launch live server
4. `npm run serve:prod` : Compile & Minify files & Launch live server

## License

Copyright (C) 2019 [omasakun](https://github.com/omasakun)

Licensed under the [MIT](LICENSE).
