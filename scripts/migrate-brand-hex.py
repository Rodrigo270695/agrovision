from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / 'resources' / 'js'

replacements = [
    ('[#0f1f3a]', 'brand-800'),
    ('[#0d1828]', 'brand-900'),
    ('[#0b1729]', 'brand-950'),
    ('[#122038]', 'brand-700'),
    ('[#152238]', 'brand-700'),
    ('[#1a2b4c]', 'brand-700'),
    ('[#163a6b]', 'brand-600'),
    ('[#1e4d8c]', 'brand-500'),
    ('[#2e5a9e]', 'brand-500'),
    ('[#3a6fb8]', 'brand-500'),
    ('[#4a90e2]', 'brand-400'),
    ('[#6b8ead]', 'muted-foreground'),
    ('[#5a7390]', 'muted-foreground'),
    ('[#3d5166]', 'muted-foreground'),
    ('[#c5d5e6]', 'brand-300'),
    ('[#d7e3f0]', 'brand-200'),
    ('[#e2eaf3]', 'brand-200'),
    ('[#e8f1fa]', 'brand-100'),
    ('[#e8eef6]', 'brand-100'),
    ('[#eef3f8]', 'muted'),
    ('[#eef4fb]', 'brand-100'),
    ('[#f4f7fb]', 'brand-50'),
    ('[#f8fafc]', 'background'),
]

changed_files = 0
total_subs = 0

for path in list(root.rglob('*.tsx')) + list(root.rglob('*.ts')):
    text = path.read_text(encoding='utf-8')
    original = text
    for old, new in replacements:
        pattern = re.escape(old)
        text, n = re.subn(pattern, new, text)
        total_subs += n
    if text != original:
        path.write_text(text, encoding='utf-8')
        changed_files += 1

print(f'files_changed={changed_files}')
print(f'substitutions={total_subs}')
