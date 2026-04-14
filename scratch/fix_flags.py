import re
import os

file_path = r"C:\Users\Elbek\Desktop\PRO\access2\frontend\src\views\Kiosk.vue"

flags = {
    "uz": "uz", "ru": "ru", "en": "us", "tr": "tr", "ar": "sa",
    "zh": "cn", "ko": "kr", "ja": "jp", "de": "de", "fr": "fr",
    "es": "es", "it": "it", "pt": "pt", "tg": "tj", "kk": "kz",
    "ky": "kg", "tm": "tm", "hi": "in", "pk": "pk", "az": "az",
    "tk": "tm", "ur": "pk"
}

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Har bir til kartasidagi emojini img tag bilan almashtirish
def replace_flag(match):
    lang_code = match.group(1)
    flag_code = flags.get(lang_code, lang_code)
    # Emojini img tagiga almashtirish (div.flag ichidagini)
    return f'data-lang="{lang_code}"><div class="flag"><img src="https://flagcdn.com/{flag_code}.svg" width="60" style="border-radius:4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" alt="{lang_code}"></div>'

# Regex: data-lang="xx"><div class="flag">...</div>
new_content = re.sub(r'data-lang="([a-z]{2})"><div class="flag">.*?</div>', replace_flag, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Flags replaced successfully with SVG images.")
