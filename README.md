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
``` clojure
; ここはコメントです。
(def sigma       ; add という名前のモジュールを定義
  (in num1)      ; num1 という入力を持つモジュールだと定義
  (in num2)
  (in num3)
  (in num4)
  (out sumValue) ; sumValue という出力を持つモジュールだと定義
  ; sumValue に、 num1 + num2 + num3 を代入
  ; Excel関数と同じく、自動的に再計算される
  (= sumValue (+ num1 num2 num3)))

(def main        ; main という名前のモジュールが、最終的な入出力をする
  (in nums w:4)  ; 幅4セルの入力、numsを持つと定義
  (out outs h:2) ; 高さ2セルの出力、outsを持つと定義
  (new adder sigma) ; sigmaモジュールのインスタンス、sigmaを持つと定義
  (= adder.num1 (nums x:0)) ; adderのnum1の入力に、numsの中でx座標が0のセルを代入
  (= adder.num2 (nums x:1))
  (= adder.num3 (nums x:2))
  (= adder.num4 `Sheet1!A1`)     ; Excel関数に、そのままの文字列で「A1」と出力される
  (= (outs y:0) adder.sumValue)
  (= (outs y:1) (outs y:0)))
```

コンパイル例:
```
A1: コメント「nums x:0」がついた緑色のセル
B1: コメント「nums x:1」がついた緑色のセル
C1: コメント「nums x:2」がついた緑色のセル
A2: 「=A1+B1+C1+Sheet1!A1」
A3: コメント「outs y:0」がついた「=A2」な青色のセル
A4: コメント「outs y:1」がついた「=A3」な青色のセル
```

### Example2 総和

Example1と同じ動作をするプログラム

Source:
``` clojure
(def sigma
  (in nums w:3)
  (in num)   ; 文法から変数と関数は区別できるため、変数と同じ名前を使ってもいい
  (out sum)
  (= sum (sum nums num)))

(def main
  (in nums w:3)
  (out outs h:2)
  (new adder sigma)
  (= adder.nums nums)
  (= adder.num `Sheet1!A1`)
  (= outs adder.sum))
```

### Example3 かけ算九九表

``` clojure
(def main
  (out table w:9 h:9)
  (var hori w:9)   ; モジュール内でのみ参照できる変数の定義
  (var vert h:9)
  (= (hori x:0..4) [1 2 3 4 5]) ; 配列の一部への代入
  (= (hori x:5..8) [6 7 8 9])
  (= (vert y:0..4) (transpose (hori x:0..4)))
  (= (vert y:5..8) (transpose (hori x:5..8)))
  (= table (* hori vert)))
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
