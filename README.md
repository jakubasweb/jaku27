# Jaku – Dekoracje balonowe: strona www

Statyczna strona (HTML + CSS + JS bez bibliotek) z formularzem wyceny obsługiwanym przez `send.php`.

## Co wrzucić na serwer

Cała zawartość tego katalogu **z wyjątkiem** `img/gallery/` i `img/pagedesign/` (to oryginały ~25 MB – strona używa zoptymalizowanych kopii z `img/web/`).

```
index.html, polityka-prywatnosci.html, regulamin.html, 404.html
send.php, .htaccess, robots.txt, sitemap.xml, site.webmanifest, favicon.ico
css/  js/  fonts/  img/icons.svg  img/web/
```

## Do zrobienia przed publikacją

1. **Domena** – zamień `https://www.example.pl` na swój adres we wszystkich plikach: `index.html` (canonical, Open Graph, JSON-LD), `polityka-prywatnosci.html`, `regulamin.html`, `sitemap.xml`, `robots.txt`.
2. **Formularz** – `send.php` wysyła maile przez `mail()` na `jaku@kontakt.pl` (stała `MAIL_TO` na górze pliku). Hosting musi obsługiwać PHP 7.4+. Po wdrożeniu wyślij testowe zapytanie ze zdjęciem.
3. **HTTPS** – włącz certyfikat SSL; `.htaccess` przekierowuje wtedy ruch na HTTPS (wymaga Apache + mod_rewrite). Na nginx przenieś reguły ręcznie.
4. **Treści do weryfikacji** – ceny „od”, godziny odpowiedzi (24 h), zasady zadatku/dojazdu/montażu, lista miejscowości i odpowiedzi FAQ to propozycje; dopasuj je do swojej oferty (ceny występują w `index.html` w cenniku, FAQ i JSON-LD).
5. **Dokumenty prawne** – `polityka-prywatnosci.html` i `regulamin.html` to wzorce przygotowane bez danych firmowych. Jeśli prowadzisz działalność gospodarczą, uzupełnij dane identyfikacyjne wymagane przepisami (nazwa firmy, adres, NIP) i najlepiej poproś o weryfikację prawnika.
6. **Zdjęcie w hero** (`img/pagedesign/hero-bg.jpg`) – upewnij się, że masz prawa do jego użycia.
7. **Statystyki / marketing** – strona nie używa zewnętrznych skryptów. Jeśli dodasz np. Google Analytics, wstaw go jako `<script type="text/plain" data-consent="analytics" src="…"></script>` (uruchomi się dopiero po zgodzie z banera) i dopisz domeny do nagłówka `Content-Security-Policy` w `.htaccess`.
8. **Social media** – w stopce nie ma linków do Facebooka/Instagrama; dodaj je, gdy będą gotowe.

## Test formularza lokalnie (bez wysyłania maili)

Potrzebny PHP (`winget install PHP.PHP.8.3`) z rozszerzeniami `mbstring` i `fileinfo`. W katalogu strony uruchom (w jednej linii, PowerShell):

```
php -d extension_dir="$((Split-Path (Get-Command php).Source))\ext" -d extension=mbstring -d extension=fileinfo -S localhost:8000
```

Otwórz `http://localhost:8000` i wyślij formularz. Na `localhost` `send.php` nie wysyła maila, tylko zapisuje wiadomość w folderze `_outbox/`: plik `.eml` (otwiera się w Outlooku/Thunderbirdzie razem z załącznikiem), `.txt` z treścią i zdjęcie inspiracji. Na serwerze z prawdziwą domeną wysyła zwykły e-mail (przełącznik `SAVE_TO_FILE` na górze `send.php`). Folder `_outbox/` nie wgrywaj na serwer.

## Struktura

- `css/style.css` – style (czcionki Nunito i Lora hostowane lokalnie w `fonts/`)
- `js/main.js` – menu, galeria z lightboxem, walidacja i wysyłka formularza, baner cookies
- `img/web/` – zdjęcia WebP w dwóch rozmiarach (`-sm` miniatury, `-lg` powiększenia), hero, logo, ikony, `og-image.jpg`
- `img/icons.svg` – sprite ikon SVG
