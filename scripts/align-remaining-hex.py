from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'resources' / 'js'

replacements = {
    '#2e5a9e': '#1e4d8c',
    "'#1a2b4c'": "'#0f1f3a'",
    '"#1a2b4c"': '"#0f1f3a"',
    'content="#1a2b4c"': 'content="#0f1f3a"',
    'fill="#1a2b4c"': 'fill="#0f1f3a"',
}

changed = 0
subs = 0
for path in list(root.rglob('*.tsx')) + list(root.rglob('*.ts')):
    text = path.read_text(encoding='utf-8')
    original = text
    for old, new in replacements.items():
        count = text.count(old)
        if count:
            text = text.replace(old, new)
            subs += count
    if text != original:
        path.write_text(text, encoding='utf-8')
        changed += 1

print(f'files_changed={changed}')
print(f'substitutions={subs}')
