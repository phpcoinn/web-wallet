<?php
/**
 * Wallet backend API (same folder as the app).
 * Use ?q=endpoint for PHP Coin–style calls. Add your own endpoints here.
 *
 * The Vue app must call this script via the full URL in VITE_WALLET_API_URL (see .env).
 * Lives in public/ so it is copied to dist/ on build.
 */

// CORS: allow cross-origin fetch from the wallet SPA (any origin; tighten if needed)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

if(function_exists('dapps_init')){
    dapps_init();
}

/** @return string Writable path for JSON price history */
function wallet_price_history_path() {
    $base = sys_get_temp_dir() . '/phpcoin_wallet_price_history.json';
    if (@is_writable(dirname($base)) || @is_writable($base)) {
        return $base;
    }
    return __DIR__ . '/.wallet_price_history.json';
}

/**
 * @return array<int, array{t:int, p:float}>
 */
function wallet_price_history_read($path) {
    if (!is_readable($path)) {
        return [];
    }
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || empty($data['records']) || !is_array($data['records'])) {
        return [];
    }
    $out = [];
    foreach ($data['records'] as $r) {
        if (isset($r['t'], $r['p']) && is_numeric($r['t']) && is_numeric($r['p'])) {
            $out[] = ['t' => (int) $r['t'], 'p' => (float) $r['p']];
        }
    }
    usort($out, static function ($a, $b) {
        return $a['t'] <=> $b['t'];
    });
    return $out;
}

/**
 * @param array<int, array{t:int, p:float}> $records
 * @return array<int, array{t:int, p:float}>
 */
function wallet_price_history_append_daily(array $records, $now, $price) {
    $oneDay = 86400;
    if ($records === []) {
        $records[] = ['t' => $now, 'p' => $price];
        return $records;
    }
    $last = $records[count($records) - 1];
    if (($now - $last['t']) >= $oneDay) {
        $records[] = ['t' => $now, 'p' => $price];
    }
    if (count($records) > 400) {
        $records = array_slice($records, -400);
    }
    return $records;
}

/**
 * @param array<int, array{t:int, p:float}> $records
 * @return float[] last up to 7 closing prices (oldest → newest)
 */
function wallet_price_series_last7(array $records) {
    if ($records === []) {
        return [];
    }
    $slice = array_slice($records, -7);
    return array_map(static function ($r) {
        return $r['p'];
    }, $slice);
}

/**
 * Read history, append a daily point if ≥1 day since last, write back (exclusive lock).
 *
 * @return array<int, array{t:int, p:float}>
 */
function wallet_price_history_update($path, $now, $price) {
    $fp = @fopen($path, 'c+');
    if ($fp === false) {
        $records = wallet_price_history_read($path);
        $records = wallet_price_history_append_daily($records, $now, $price);
        @file_put_contents($path, json_encode(['records' => $records], JSON_UNESCAPED_SLASHES));
        return $records;
    }
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        $records = wallet_price_history_read($path);
        $records = wallet_price_history_append_daily($records, $now, $price);
        @file_put_contents($path, json_encode(['records' => $records], JSON_UNESCAPED_SLASHES));
        return $records;
    }
    $size = filesize($path);
    $content = ($size !== false && $size > 0) ? fread($fp, $size) : '';
    $records = [];
    if ($content !== '' && $content !== false) {
        $data = json_decode($content, true);
        if (is_array($data) && !empty($data['records']) && is_array($data['records'])) {
            foreach ($data['records'] as $r) {
                if (isset($r['t'], $r['p']) && is_numeric($r['t']) && is_numeric($r['p'])) {
                    $records[] = ['t' => (int) $r['t'], 'p' => (float) $r['p']];
                }
            }
            usort($records, static function ($a, $b) {
                return $a['t'] <=> $b['t'];
            });
        }
    }
    $records = wallet_price_history_append_daily($records, $now, $price);
    $payload = json_encode(['records' => $records], JSON_UNESCAPED_SLASHES);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, $payload !== false ? $payload : '{"records":[]}');
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return $records;
}

$q = $_GET['q'] ?? '';

// Test endpoint – call from frontend to verify wallet_api.php is reachable
if ($q === 'test') {
    echo json_encode([
        'status' => 'ok',
        'data'   => 'Hello from wallet_api.php',
        'time'   => date('c'),
    ]);
    exit;
}

// PHP Price – fetch from KlingEx/dapps coinInfo; daily snapshots in temp file → series = last 7 closes
if ($q === 'getPrice') {
    $url = 'https://main1.phpcoin.net/dapps.php?url=PeC85pqFgRxmevonG6diUwT4AfF7YUPSm3/api.php?q=coinInfo';
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 5,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) {
        http_response_code(502);
        echo json_encode(['status' => 'error', 'error' => 'Failed to fetch price']);
        exit;
    }
    $info = json_decode($raw, true);
    if (!is_array($info)) {
        http_response_code(502);
        echo json_encode(['status' => 'error', 'error' => 'Invalid price response']);
        exit;
    }
    $price = isset($info['usdPrice']) ? (float) $info['usdPrice'] : 0.0;
    // API returns percent (e.g. 2.5 = +2.5%), not absolute $ move
    $changePct24h = isset($info['market']['priceChange24h']) ? (float) $info['market']['priceChange24h'] : 0.0;

    $now = time();
    $historyPath = wallet_price_history_path();
    $records = wallet_price_history_update($historyPath, $now, $price);
    $series = wallet_price_series_last7($records);
    if ($series === []) {
        $series = [$price];
    }

    echo json_encode([
        'status' => 'ok',
        'data'   => [
            'price'               => $price,
            'changeSinceLastWeek' => $changePct24h,
            'series'              => $series,
        ],
    ]);
    exit;
}

// Add more endpoints here. For PHP Coin node calls, proxy to your node or implement locally.
http_response_code(404);
echo json_encode([
    'status' => 'error',
    'error'  => 'Unknown endpoint: ' . ($q ?: '(none)'),
]);
