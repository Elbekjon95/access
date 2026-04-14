$path = "C:\Users\Elbek\Desktop\PRO\access2\frontend\src\views\Kiosk.vue"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$newModal = @"
  <!-- Boshlang'ich Til Tanlash Modali -->
  <div id="lang-selection-modal" class="modal lang-modal-overlay">
    <div class="lang-selection-content glass">
      <div class="lang-header">
        <h2>TILNI TANLANG / ВЫБЕРИТЕ ЯЗЫК / SELECT LANGUAGE</h2>
        <div class="header-line"></div>
      </div>
      
      <div class="lang-grid">
        <button class="lang-card" data-lang="uz"><div class="flag"><img src="https://flagcdn.com/uz.svg" width="60" alt="UZ"></div><div class="name">O'zbekcha</div><div class="desc">Asosiy menyu</div></button>
        <button class="lang-card" data-lang="ru"><div class="flag"><img src="https://flagcdn.com/ru.svg" width="60" alt="RU"></div><div class="name">Русский</div><div class="desc">Основное меню</div></button>
        <button class="lang-card" data-lang="en"><div class="flag"><img src="https://flagcdn.com/us.svg" width="60" alt="US"></div><div class="name">English</div><div class="desc">Main Menu</div></button>
        <button class="lang-card" data-lang="tr"><div class="flag"><img src="https://flagcdn.com/tr.svg" width="60" alt="TR"></div><div class="name">Türkçe</div><div class="desc">Ana Menü</div></button>
        <button class="lang-card" data-lang="ar"><div class="flag"><img src="https://flagcdn.com/sa.svg" width="60" alt="SA"></div><div class="name">العربية</div><div class="desc">القائمة الرئيسية</div></button>
        
        <button class="lang-card" data-lang="zh"><div class="flag"><img src="https://flagcdn.com/cn.svg" width="60" alt="CN"></div><div class="name">中文</div><div class="desc">主菜单</div></button>
        <button class="lang-card" data-lang="ko"><div class="flag"><img src="https://flagcdn.com/kr.svg" width="60" alt="KR"></div><div class="name">한국어</div><div class="desc">메인 메뉴</div></button>
        <button class="lang-card" data-lang="ja"><div class="flag"><img src="https://flagcdn.com/jp.svg" width="60" alt="JP"></div><div class="name">日本語</div><div class="desc">メインメニュー</div></button>
        <button class="lang-card" data-lang="de"><div class="flag"><img src="https://flagcdn.com/de.svg" width="60" alt="DE"></div><div class="name">Deutsch</div><div class="desc">Hauptmenü</div></button>
        <button class="lang-card" data-lang="fr"><div class="flag"><img src="https://flagcdn.com/fr.svg" width="60" alt="FR"></div><div class="name">Français</div><div class="desc">Menu Principal</div></button>
        
        <button class="lang-card" data-lang="es"><div class="flag"><img src="https://flagcdn.com/es.svg" width="60" alt="ES"></div><div class="name">Español</div><div class="desc">Menú Principal</div></button>
        <button class="lang-card" data-lang="it"><div class="flag"><img src="https://flagcdn.com/it.svg" width="60" alt="IT"></div><div class="name">Italiano</div><div class="desc">Menu Principale</div></button>
        <button class="lang-card" data-lang="pt"><div class="flag"><img src="https://flagcdn.com/pt.svg" width="60" alt="PT"></div><div class="name">Português</div><div class="desc">Menu Principal</div></button>
        <button class="lang-card" data-lang="tg"><div class="flag"><img src="https://flagcdn.com/tj.svg" width="60" alt="TJ"></div><div class="name">Тоҷикӣ</div><div class="desc">Менюи асосӣ</div></button>
        <button class="lang-card" data-lang="kk"><div class="flag"><img src="https://flagcdn.com/kz.svg" width="60" alt="KZ"></div><div class="name">Қазақша</div><div class="desc">Негізгі мәзір</div></button>
        
        <button class="lang-card" data-lang="ky"><div class="flag"><img src="https://flagcdn.com/kg.svg" width="60" alt="KG"></div><div class="name">Кыргызcha</div><div class="desc">Башкы menyu</div></button>
        <button class="lang-card" data-lang="tk"><div class="flag"><img src="https://flagcdn.com/tm.svg" width="60" alt="TM"></div><div class="name">Türkmençe</div><div class="desc">Esasy menýu</div></button>
        <button class="lang-card" data-lang="hi"><div class="flag"><img src="https://flagcdn.com/in.svg" width="60" alt="IN"></div><div class="name">हिन्दी</div><div class="desc">Muxay Menyu</div></button>
        <button class="lang-card" data-lang="ur"><div class="flag"><img src="https://flagcdn.com/pk.svg" width="60" alt="PK"></div><div class="name">اردو</div><div class="desc">مین مینیo</div></button>
        <button class="lang-card" data-lang="az"><div class="flag"><img src="https://flagcdn.com/az.svg" width="60" alt="AZ"></div><div class="name">Azərbaycanca</div><div class="desc">Ana menyu</div></button>
      </div>
    </div>
  </div>
"@

$startTag = "  <!-- Boshlang'ich Til Tanlash Modali -->"
$endTag = "  </div>\s+</div>\s+</div>" # Bu biroz xavfli bo'lishi mumkin, shuning uchun aniqroq qilamiz

# Modalni butunlay almashtirish (regex yordamida)
# <div id="lang-selection-modal".*?</div>\s*?</div>\s*?</div>
$pattern = '(?s)<!-- Boshlang''ich Til Tanlash Modali -->.*?</div>\s+</div>\s+</div>'
$newContent = [regex]::Replace($content, $pattern, $newModal)

[System.IO.File]::WriteAllText($path, $newContent, $utf8NoBom)
Write-Host "Flags replaced successfully with SVG images using PowerShell."
