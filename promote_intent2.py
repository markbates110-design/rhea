import re

with open(r'd:\Rhea\design_ideation\rhea-creation-intent.md', 'r', encoding='utf-8') as f:
    content = f.read()

new_current = (
    "### Current Creation Intent\n\n"
    "**Project:** GrubGauge \u2014 Polish, Identity & Deploy\n"
    "**Timestamp:** 2026-05-09 19:48 CT\n\n"
    "Polish existing screens, resolve global ratings via device UUID identity (localStorage, no login), deploy to Vercel.\n"
)

new_template_header = (
    "### \u2192 Sticky Template: Paste New Creation Intent Here \u2190\n\n"
    "*(Paste your new or updated Creation Intent below this line. "
    "Then tell the Governance Agent: \"Update Creation Intent from template\")*\n\n"
    "---\n\n"
)

dashboard_archive = (
    "**GrubGauge Dashboard \u2014 2026-05-09 19:36 CT**\n"
    "Build Dashboard. Stats (total, avg score, fav type, best spot). Quick actions. Recent ratings list.\n\n"
)

# Replace everything from sticky template to end of current intent
pattern = r'### \u2192 Sticky Template.*?(?=---\n\n### Creation Intent History)'
replacement = new_template_header + new_current + "\n---\n\n"
result = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Archive dashboard entry
result = result.replace(
    '### Creation Intent History\n\n**GrubGauge Explore Screen',
    '### Creation Intent History\n\n' + dashboard_archive + '**GrubGauge Explore Screen'
)

with open(r'd:\Rhea\design_ideation\rhea-creation-intent.md', 'w', encoding='utf-8') as f:
    f.write(result)

print('Done. Changed:', result != content)
