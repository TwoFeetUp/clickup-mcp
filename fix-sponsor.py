import re
import glob

files = glob.glob('src/**/*.ts', recursive=True)
count = 0
for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content

        # Pattern to match sponsorService.createResponse with 2 arguments (including multiline)
        # This matches: sponsorService.createResponse( ... , true/false)
        pattern = r'sponsorService\.createResponse\(((?:[^()]|\([^()]*\))*?),\s*(?:true|false)\s*\)'

        def replace_match(match):
            return f'sponsorService.createResponse({match.group(1)})'

        new_content = re.sub(pattern, replace_match, content, flags=re.DOTALL)

        if new_content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
            print(f'Fixed: {filepath}')
    except Exception as e:
        print(f'Error in {filepath}: {e}')

print(f'\nTotal files fixed: {count}')
