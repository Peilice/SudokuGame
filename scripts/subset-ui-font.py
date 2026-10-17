"""
把介面字（內海字體 NaikaiFont）子集化成只含介面用到的字，輸出到 src/fonts/。

介面文案改動、出現新的中文字時要重跑一次；沒收錄的字會退回系統字，不會變成方塊，但字形會不一致。

需求：pip install fonttools brotli
來源字型：github.com/max32002/naikaifont 的 tw/NaikaiFont-Regular.ttf、tw/NaikaiFont-Bold.ttf（SIL OFL 1.1）

用法：python scripts/subset-ui-font.py <放 NaikaiFont-*.ttf 的資料夾>
"""

import re
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'fonts'
WEIGHTS = {'Regular': 400, 'Bold': 700}


def ui_text() -> str:
    """收集畫面上可能出現的字：index.html 與 src 底下的 TypeScript，去掉註解只留文案與程式碼。"""
    parts = []
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    parts.append(re.sub(r'<!--.*?-->', '', html, flags=re.S))
    for ts in sorted((ROOT / 'src').rglob('*.ts')):
        code = ts.read_text(encoding='utf-8')
        code = re.sub(r'/\*.*?\*/', '', code, flags=re.S)
        code = re.sub(r'(?m)^\s*//.*$|(?<=[;{}),])\s*//.*$', '', code)
        parts.append(code)
    # ASCII 可見字元全收：時間、數字、快捷鍵名稱都會用到
    parts.append(''.join(chr(c) for c in range(0x20, 0x7F)))
    # 介面常用的全形標點，即使目前文案沒用到也先收進來
    parts.append('，。、；：？！「」『』（）／～…—·')
    return ''.join(sorted({c for c in ''.join(parts) if c.isprintable()}))


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding='utf-8')
    src_dir = Path(sys.argv[1])
    text = ui_text()
    print(f'收錄 {len(text)} 個字')
    for name, weight in WEIGHTS.items():
        out = OUT / f'naikai-ui-{weight}.woff2'
        subset.main([
            str(src_dir / f'NaikaiFont-{name}.ttf'),
            f'--text={text}',
            '--flavor=woff2',
            '--no-hinting',
            '--desubroutinize',
            '--layout-features=kern,palt',
            f'--output-file={out}',
        ])
        print(f'{out.relative_to(ROOT)}：{out.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
