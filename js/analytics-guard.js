// GoatCounter(count.js)が送る内容から、URLのクエリ(?q=検索語 など)を取り除く。
// count.js は、標準ではパスに「?以降」を含め、さらに location.search を q として別に送る。
// 検索語(自由入力)は計測に含めない方針なので、count.js を読み込む前に設定を差し込む(head に埋め込む)。
//   - path:     パスから ? と # 以降を落とす(標準は pathname + search)
//   - referrer: 同じサイトの前のページ(検索語つきのURLがありうる)は送らない
//   - get_data: count.js が定義する get_data の結果の q(location.search)から、目印の ref だけを残して他を空にする
// ref は、運営者が人に渡すURLの末尾に付ける「どのリンクから来たか」の目印(README「アクセス解析」)。
// 値は英数字・-・_ の40字までだけ通す(それ以外の文字を含むものは捨てる)。
// 計測が読み込めない・仕様が変わって差し込みが効かないときも、サイトの機能には影響しない。
// apply-shell.mjs が全ページの <!-- shell:head --> に、この文字列をそのまま埋め込む。

export const ANALYTICS_GUARD_SOURCE =
  "(function(){var f,g={path:function(p){return String(p).split(/[?#]/)[0]||'/'}," +
  "referrer:function(r){try{return new URL(r).origin===location.origin?'':r}catch(e){return ''}}};" +
  "Object.defineProperty(g,'get_data',{configurable:true,enumerable:true,get:function(){return f}," +
  "set:function(h){f=function(v){var d=h(v),m=/[?&]ref=([A-Za-z0-9_-]{1,40})(?:&|$)/.exec(d.q||'');" +
  "d.q=m?'?ref='+m[1]:'';return d}}});window.goatcounter=g})();";
