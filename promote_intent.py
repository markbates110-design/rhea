import re

with open(r'd:\Rhea\design_ideation\rhea-creation-intent.md', 'r', encoding='utf-8') as f:
    content = f.read()

# New template section
template_section = (
    "\u2192 Sticky Template: Paste New Creation Intent Here \u2190\n\n"
    "*(Paste your new or updated Creation Intent below this line. "
    "Then tell the Governance Agent: \"Update Creation Intent from template\")*\n\n"
    "---\n"
)

new_current = (
    "### Current Creation Intent\n\n"
    "**Project:** GrubGauge \u2014 Dashboard\n"
    "**Timestamp:** 2026-05-09 19:36 CT\n\n"
    "Build the Dashboard / Home screen. Stats (total ratings, avg score, fav venue type). "
    "Quick actions (Rate, Explore, History). Recent ratings preview. Mobile-first, design system compliant.\n"
)

# Archive old current intent
archive_entry = (
    "**GrubGauge Explore Screen \u2014 2026-05-09 19:21 CT**\n"
    "Build Explore screen. Top-rated spots from Supabase. Filter by venue type, sort by score. "
    "Deduplication by place_id. Client-side filtering.\n\n"
)

# Replace the entire block between template header and Creation Intent History
pattern = r'(### )(\u2192 Sticky Template[^\n]*\n\n[^\n]*\n\n---\n).*?(### Creation Intent History)'
replacement = r'\1' + template_section + '\n' + new_current + '\n---\n\n### Creation Intent History'
result = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Insert archive entry after Creation Intent History header
result = result.replace(
    '### Creation Intent History\n\n**GrubGauge History Screen',
    '### Creation Intent History\n\n' + archive_entry + '**GrubGauge History Screen'
)

with open(r'd:\Rhea\design_ideation\rhea-creation-intent.md', 'w', encoding='utf-8') as f:
    f.write(result)

print('Done. Changed:', result != content)
