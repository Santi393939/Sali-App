"""List every English string the app translates, and which are missing from the Arabic and French tables.

Usage: python3 scripts/i18n-extract.py [--json]
"""
import glob, json, re, sys

def literals_in_t(src):
    out = []
    for m in re.finditer(r"(?<![\w.])t\(", src):
        i = m.end(); depth = 0; first = True; j = i
        while j < len(src):
            c = src[j]
            if c in "'\"`":
                q = c; k = j + 1
                while src[k] != q:
                    k += 2 if src[k] == '\\' else 1
                if first and q == "'": out.append(src[j + 1:k].replace("\\'", "'"))
                j = k + 1; continue
            if c in '([{': depth += 1
            elif c in ')]}':
                if depth == 0: break
                depth -= 1
            elif c == ',' and depth == 0: first = False
            j += 1
    return out

keys = []
for f in sorted(glob.glob('src/**/*.ts*', recursive=True)):
    if '/i18n/' in f or f.endswith('kit.tsx'): continue
    keys += literals_in_t(open(f).read())
# Content read through localized(): pull the text fields straight from the files.
c = open('src/content/milestones.ts').read()
keys += re.findall(r"\b(?:name|title|earnedLine|goalLine): '((?:[^'\\]|\\.)*)'", c)
for f in ['src/content/rewards.ts', 'src/content/extras.ts', 'src/store/streaks.ts', 'src/store/quests.ts']:
    keys += re.findall(r"\b(?:name|title): '((?:[^'\\]|\\.)*)'", open(f).read())
r = open('src/content/reminders.ts').read()
REMINDER_ENGLISH = [k.replace("\\'", "'") for k in re.findall(r"english:\s*'((?:[^'\\]|\\.)*)'", r)]
keys += REMINDER_ENGLISH
keys += re.findall(r"sourceRef: '([^']*)'", r)
keys += ["Qur'an", 'Hadith', 'Video']
seen = []; [seen.append(k) for k in keys if k not in seen and re.search('[A-Za-z]', k)]

def table(path):
    s = open(path).read()
    return set(re.findall(r"^\s*'((?:[^'\\]|\\.)*)':", s, re.M)) | set(re.findall(r'^\s*"((?:[^"\\]|\\.)*)":', s, re.M))
if '--json' in sys.argv:
    print(json.dumps(seen, ensure_ascii=False, indent=1))
else:
    for lang in ['ar', 'fr']:
        have = {k.replace("\\'", "'") for k in table(f'src/content/i18n/{lang}.ts')}
        # Arabic shows reminder cards in Arabic only; names in the Group preview stay as they are.
        skip = set(REMINDER_ENGLISH) if lang == 'ar' else set()
        skip |= {'G', 'Amina', 'Omar'}
        miss = [k for k in seen if k not in have and k not in skip]
        print(f'{lang}: {len(seen) - len(miss)}/{len(seen)} translated')
        for k in miss: print('  missing:', k)
