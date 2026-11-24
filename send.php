<?php
/**
 * Obsługa formularza szybkiej wyceny – wysyła wiadomość e-mail (z opcjonalnym zdjęciem inspiracji).
 * Wymagania: PHP 7.4+ z włączoną funkcją mail() (standard na hostingach współdzielonych).
 *
 * KONFIGURACJA: zmień tylko stałe poniżej.
 */
declare(strict_types=1);

const MAIL_TO    = 'jaku@kontakt.pl';
const SITE_NAME  = 'Jaku – Dekoracje balonowe';
const MAX_FILE   = 8 * 1024 * 1024; // 8 MB (formularz zmniejsza zdjęcia automatycznie)
const MIN_SECS   = 3;               // minimalny czas wypełniania (ochrona przed botami)
const COOLDOWN   = 30;              // odstęp między wysyłkami z jednego adresu IP (s)

/**
 * TRYB TESTOWY: zamiast wysyłać e-mail, zapisuje wiadomość do folderu _outbox/ (plik .eml, .txt i załączone zdjęcie).
 *  null  = automatycznie: włączony tylko gdy strona działa na localhost / 127.0.0.1 (na serwerze wysyła prawdziwy mail)
 *  true  = zawsze zapisuj do pliku, false = zawsze wysyłaj mail
 */
const SAVE_TO_FILE = null;
const OUTBOX_DIR   = __DIR__ . '/_outbox';

date_default_timezone_set('Europe/Warsaw');
mb_internal_encoding('UTF-8');

$wantsJson = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'fetch';

function respond(bool $ok, string $message, int $status = 200): void
{
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ./?' . ($ok ? 'wyslano=1' : 'blad=1') . '#wycena', true, 303);
    }
    exit;
}

function clean(?string $s, int $max): string
{
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $s) ?? '';
    return mb_substr(trim($s), 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Nieprawidłowe żądanie.', 405);
}

// Żądanie musi pochodzić z tej samej domeny
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$hostOnly = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $hostOnly) {
    respond(false, 'Nieprawidłowe żądanie.', 403);
}

// Pułapka na boty (pole ukryte) i minimalny czas wypełniania – udajemy sukces
if (clean($_POST['website'] ?? '', 200) !== '') {
    respond(true, 'OK');
}
$ts = (int) ($_POST['ts'] ?? 0);
if ($ts > 0 && (time() - intdiv($ts, 1000)) < MIN_SECS) {
    respond(true, 'OK');
}

// Ograniczenie częstotliwości
$rlFile = sys_get_temp_dir() . '/jaku_rl_' . md5($_SERVER['REMOTE_ADDR'] ?? 'x');
if (is_file($rlFile) && (time() - (int) filemtime($rlFile)) < COOLDOWN) {
    respond(false, 'Zapytanie zostało już wysłane. Odczekaj chwilę i spróbuj ponownie.', 429);
}

// Dane z formularza
$imie        = clean($_POST['imie'] ?? '', 80);
$telefon     = clean($_POST['telefon'] ?? '', 20);
$email       = clean($_POST['email'] ?? '', 120);
$okazja      = clean($_POST['okazja'] ?? '', 60);
$dataRaw     = clean($_POST['data'] ?? '', 10);
$dataNieznana = ($_POST['data_nieznana'] ?? '') === 'tak';
$lokalizacja = clean($_POST['lokalizacja'] ?? '', 120);
$kolory      = clean($_POST['kolory'] ?? '', 120);
$link        = clean($_POST['inspiracja_link'] ?? '', 300);
$zgoda       = ($_POST['zgoda'] ?? '') === 'tak';

$okazje = ['Chrzciny', 'Komunia Święta', 'Urodziny / roczek', 'Osiemnastka / jubileusz', 'Wesele / rocznica', 'Otwarcie lokalu / event firmowy', 'Inna okazja'];
$dekoracjeDozwolone = ['Girlanda', 'Ścianka / tło do zdjęć', 'Łuk', 'Bukiety z helem', 'Cyfry i litery', 'Pełna oprawa sali', 'Nie wiem – proszę o doradztwo'];

$dekoracje = [];
foreach ((array) ($_POST['dekoracje'] ?? []) as $d) {
    $d = clean(is_string($d) ? $d : '', 60);
    if (in_array($d, $dekoracjeDozwolone, true)) {
        $dekoracje[] = $d;
    }
}

// Walidacja po stronie serwera
$digits = preg_replace('/\D/', '', $telefon) ?? '';
$errors = [];
if (mb_strlen($imie) < 2) { $errors[] = 'imię'; }
if (!preg_match('/^[\d\s()+-]+$/', $telefon) || strlen($digits) < 9 || strlen($digits) > 15) { $errors[] = 'telefon'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'e-mail'; }
if (!in_array($okazja, $okazje, true)) { $errors[] = 'okazja'; }
if (mb_strlen($lokalizacja) < 2) { $errors[] = 'lokalizacja'; }
if (!$zgoda) { $errors[] = 'zgoda'; }

$dataTxt = 'jeszcze nie ustalona';
if (!$dataNieznana) {
    $dt = DateTime::createFromFormat('!Y-m-d', $dataRaw);
    if (!$dt || $dt->format('Y-m-d') !== $dataRaw || $dt < new DateTime('today')) {
        $errors[] = 'data';
    } else {
        $dataTxt = $dt->format('d.m.Y');
    }
}
if ($link !== '' && !preg_match('#^https?://\S+\.\S+$#i', $link)) { $errors[] = 'link'; }

if ($errors) {
    respond(false, 'Sprawdź poprawność pól: ' . implode(', ', $errors) . '.', 422);
}

// Załącznik (zdjęcie inspiracji)
$attachment = null;
if (isset($_FILES['inspiracja_plik']) && $_FILES['inspiracja_plik']['error'] !== UPLOAD_ERR_NO_FILE) {
    $f = $_FILES['inspiracja_plik'];
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > MAX_FILE || !is_uploaded_file($f['tmp_name'])) {
        respond(false, 'Nie udało się przesłać zdjęcia (maks. 8 MB). Wyślij je w odpowiedzi na maila.', 422);
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($f['tmp_name']);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime] ?? null;
    if ($ext === null || @getimagesize($f['tmp_name']) === false) {
        respond(false, 'Dozwolone formaty zdjęcia: JPG, PNG, WebP.', 422);
    }
    $attachment = ['mime' => $mime, 'name' => 'inspiracja.' . $ext, 'data' => file_get_contents($f['tmp_name'])];
}

// Treść wiadomości
$lines = [
    'Nowe zapytanie o wycenę ze strony ' . SITE_NAME,
    str_repeat('-', 48),
    'Imię:        ' . $imie,
    'Telefon:     ' . $telefon,
    'E-mail:      ' . $email,
    'Okazja:      ' . $okazja,
    'Data:        ' . $dataTxt,
    'Lokalizacja: ' . $lokalizacja,
    'Dekoracje:   ' . ($dekoracje ? implode(', ', $dekoracje) : '—'),
    'Kolory:      ' . ($kolory !== '' ? $kolory : '—'),
    'Inspiracja:  ' . ($link !== '' ? $link : '—'),
    'Zdjęcie:     ' . ($attachment ? 'w załączniku' : 'brak'),
    str_repeat('-', 48),
    'Zgoda na przetwarzanie danych w celu wyceny: TAK (' . date('d.m.Y H:i') . ')',
];
$body = implode("\r\n", $lines) . "\r\n";

$host = preg_replace('/[^a-z0-9.-]/i', '', (string) ($_SERVER['SERVER_NAME'] ?? 'localhost')) ?: 'localhost';
$host = preg_replace('/^www\./i', '', $host);
$from = 'formularz@' . $host;

$subject = 'Zapytanie o wycenę: ' . $okazja . ' – ' . $imie;
$headers = [
    'From: =?UTF-8?B?' . base64_encode(SITE_NAME) . '?= <' . $from . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
];

if ($attachment) {
    $boundary = 'b_' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';
    $message  = '--' . $boundary . "\r\n";
    $message .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
    $message .= chunk_split(base64_encode($body)) . "\r\n";
    $message .= '--' . $boundary . "\r\n";
    $message .= 'Content-Type: ' . $attachment['mime'] . '; name="' . $attachment['name'] . "\"\r\n";
    $message .= "Content-Transfer-Encoding: base64\r\n";
    $message .= 'Content-Disposition: attachment; filename="' . $attachment['name'] . "\"\r\n\r\n";
    $message .= chunk_split(base64_encode($attachment['data'])) . "\r\n";
    $message .= '--' . $boundary . "--\r\n";
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: base64';
    $message = chunk_split(base64_encode($body));
}

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$hostHeader = strtolower($hostOnly);
$isLocal = in_array($hostHeader, ['localhost', '127.0.0.1', '[::1]', '::1'], true);
$saveToFile = SAVE_TO_FILE ?? $isLocal;

if ($saveToFile) {
    if (!is_dir(OUTBOX_DIR) && !@mkdir(OUTBOX_DIR, 0755, true)) {
        respond(false, 'Tryb testowy: nie można utworzyć folderu _outbox.', 500);
    }
    // Folder z testowymi wiadomościami nie może być dostępny z internetu
    @file_put_contents(OUTBOX_DIR . '/.htaccess', "Require all denied\n");

    $base = OUTBOX_DIR . '/' . date('Y-m-d_H-i-s') . '_' . bin2hex(random_bytes(2));
    $eml = 'To: ' . MAIL_TO . "\r\nSubject: " . $encodedSubject . "\r\n" . implode("\r\n", $headers) . "\r\n\r\n" . $message;
    $ok = @file_put_contents($base . '.eml', $eml) !== false
        && @file_put_contents($base . '.txt', $body) !== false;
    if ($ok && $attachment) {
        $ok = @file_put_contents($base . '_' . $attachment['name'], $attachment['data']) !== false;
    }
    if (!$ok) {
        respond(false, 'Tryb testowy: nie udało się zapisać wiadomości do _outbox.', 500);
    }
    respond(true, 'Tryb testowy: wiadomość zapisana w folderze _outbox.');
}

$sent = mail(MAIL_TO, $encodedSubject, $message, implode("\r\n", $headers));

if (!$sent) {
    respond(false, 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub zadzwoń: 667 285 016.', 500);
}

@touch($rlFile);
respond(true, 'Wiadomość wysłana.');
