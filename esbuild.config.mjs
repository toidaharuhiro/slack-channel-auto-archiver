import esbuild from 'esbuild';
import { GasPlugin } from 'esbuild-gas-plugin';

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  format: 'iife',
  target: 'es2020',
  plugins: [GasPlugin],
  // GAS はトップレベルの関数を公開する必要がある
  // GasPlugin がグローバルスコープへの公開を処理する
}).then(() => {
  console.log('✅ ビルド成功: dist/Code.js');
}).catch((error) => {
  console.error('❌ ビルドエラー:', error);
  process.exit(1);
});
