"""
Pack the web export (dist/) into one self-contained HTML page for the
shareable preview link: inlines the JS bundle, the fonts the app uses and
the sounds. Run after `npx expo export --platform web`:

    python3 scripts/build-preview.py dist preview.html
"""
import base64
import re
import sys

src, out = sys.argv[1], sys.argv[2]
USED_FONTS = ['Amiri_400Regular.', 'Amiri_700Bold.', 'CormorantGaramond_600SemiBold.', 'CormorantGaramond_700Bold.',
              'Inter_400Regular.', 'Inter_500Medium.', 'Inter_600SemiBold.']
MIME = {'ttf': 'font/ttf', 'wav': 'audio/wav'}

html = open(f'{src}/index.html').read()
scripts = re.findall(r'<script src="([^"]+)" defer></script>', html)
js = ''
for path in scripts:
    code = open(src + path).read()
    for asset in set(re.findall(r'"(/assets/[^"]+\.(?:ttf|wav))"', code)):
        name = asset.split('/')[-1]
        ext = name.rsplit('.', 1)[1]
        if ext == 'ttf' and not any(u in name for u in USED_FONTS):
            continue
        data = base64.b64encode(open(src + asset, 'rb').read()).decode()
        code = code.replace(f'"{asset}"', f'"data:{MIME[ext]};base64,{data}"')
    js += '<script>' + code.replace('</script', '<\\/script') + '</script>\n'

head = re.search(r'<style id="expo-reset">.*?</style>', html, re.S).group(0)
head = head.replace('</style>', '  body { background: #F3EADB; }\n</style>')
page = (
    '<title>Salli Today Preview</title>\n'
    '<script>try{history.replaceState(null,"","/")}catch(e){}</script>\n'
    + head
    + '\n<noscript>Turn on JavaScript to use the Salli preview.</noscript>\n<div id="root"></div>\n'
    + js
)
open(out, 'w').write(page)
print(f'{out}: {len(page) / 1e6:.1f} MB')
