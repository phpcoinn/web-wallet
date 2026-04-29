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
function wallet_price_round($price) {
    return round((float)$price, 8);
}

/**
 * @param array<int, array{t:int, p:float}> $records
 * @return array<int, array{t:int, p:float}>
 */
function wallet_price_history_append_daily(array $records, $now, $price) {
    $oneDay = 86400;
    $price = wallet_price_round($price);
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
        return wallet_price_round($r['p']);
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

/** Node origin for api.php (authenticate, etc.). Override via WALLET_NODE_MAIN if wallet_api is not on the same infra. */
if (!defined('WALLET_NODE_MAIN')) {
    define('WALLET_NODE_MAIN', getenv('WALLET_NODE_MAIN') ?: 'https://main1.phpcoin.net');
}
/** Verifier dapp `api.php` path under dapps.php ?url= */
if (!defined('WALLET_VERIFIER_API_DAPP_PATH')) {
    define('WALLET_VERIFIER_API_DAPP_PATH', getenv('WALLET_VERIFIER_API_DAPP_PATH') ?: 'PeC85pqFgRxmevonG6diUwT4AfF7YUPSm3/verifier/api.php');
}
/** Payout address shown after authorize; should match VITE_VERIFIER_ADDRESS in the SPA. */
if (!defined('WALLET_VERIFIER_PAYOUT_ADDRESS')) {
    define('WALLET_VERIFIER_PAYOUT_ADDRESS', getenv('WALLET_VERIFIER_PAYOUT_ADDRESS') ?: 'PdGDUs3Hc6F2CtRnmM4cz1iwuAqfD8hpRE');
}

/**
 * Proxy GET to verifier dapp api.php?q=verify (no redirect) so the browser avoids cross-origin dapps.php.
 */
if ($q === 'verifierRequestFunds') {
    $address = isset($_GET['address']) ? trim((string) $_GET['address']) : '';
    if ($address === '' || strlen($address) < 10) {
        echo json_encode(['status' => 'error', 'error' => 'Invalid address']);
        exit;
    }
    $path = WALLET_VERIFIER_API_DAPP_PATH;
    $url = WALLET_NODE_MAIN . '/dapps.php?url=' . rawurlencode($path) . '&q=verify&address=' . rawurlencode($address);
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 25,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false || $raw === '') {
        http_response_code(502);
        echo json_encode(['status' => 'error', 'error' => 'Verifier request failed']);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    echo $raw;
    exit;
}

/** One-time nonce for wallet-only "send back" authorization (forwarded to node authenticate). */
if ($q === 'verifierSendBackChallenge') {
    $nonce = 'wb-verifier-sendback-' . bin2hex(random_bytes(16));
    echo json_encode(['status' => 'ok', 'data' => ['nonce' => $nonce]]);
    exit;
}

/**
 * POST JSON { public_key, signature, nonce } — forwards to node authenticate; on success returns verifier payout address.
 */
if ($q === 'verifierSendBackAuthorize') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'error' => 'POST required']);
        exit;
    }
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }
    $pk = isset($input['public_key']) ? trim((string) $input['public_key']) : '';
    $sig = isset($input['signature']) ? trim((string) $input['signature']) : '';
    $nonce = isset($input['nonce']) ? (string) $input['nonce'] : '';
    if ($pk === '' || $sig === '' || $nonce === '') {
        echo json_encode(['status' => 'error', 'error' => 'Missing public_key, signature, or nonce']);
        exit;
    }
    $base = WALLET_NODE_MAIN . '/api.php';
    $sep = strpos($base, '?') !== false ? '&' : '?';
    $authUrl = $base . $sep . http_build_query([
        'q' => 'authenticate',
        'public_key' => $pk,
        'signature' => $sig,
        'nonce' => $nonce,
    ]);
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($authUrl, false, $ctx);
    if ($raw === false || $raw === '') {
        http_response_code(502);
        echo json_encode(['status' => 'error', 'error' => 'Node authenticate failed']);
        exit;
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || ($decoded['status'] ?? '') !== 'ok') {
        $err = is_array($decoded) ? ($decoded['error'] ?? $decoded['message'] ?? 'Unauthorized') : 'Unauthorized';
        echo json_encode(['status' => 'error', 'error' => (string) $err]);
        exit;
    }
    echo json_encode([
        'status' => 'ok',
        'data' => [
            'verifierAddress' => WALLET_VERIFIER_PAYOUT_ADDRESS,
        ],
    ]);
    exit;
}

/**
 * Legacy dapps bridge:
 * - wallet authenticates user in SPA
 * - wallet posts account + redirect here
 * - this endpoint attaches auth_data (including current session request_code)
 *   so dapp top.php can decode it and set $_SESSION['account'].
 */
if ($q === 'sessionLoginComplete') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'error' => 'POST required']);
        exit;
    }
    $input = $_POST;
    if (!is_array($input) || count($input) === 0) {
        $input = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $input = [];
        }
    }

    $redirect = isset($input['redirect']) ? trim((string) $input['redirect']) : '';

    $account = isset($input['account']) && is_array($input['account']) ? $input['account'] : [];
    $address = isset($input['address']) ? trim((string) $input['address']) : '';
    if ($address === '' && isset($account['address'])) {
        $address = trim((string) $account['address']);
    }

    $publicKey = isset($input['public_key'])
        ? trim((string) $input['public_key'])
        : (isset($input['publicKey']) ? trim((string) $input['publicKey']) : '');
    if ($publicKey === '' && is_array($account)) {
        $publicKey = isset($account['public_key'])
            ? trim((string) $account['public_key'])
            : (isset($account['publicKey']) ? trim((string) $account['publicKey']) : '');
    }

    if ($redirect === '' && isset($_GET['redirect'])) {
        $redirect = trim((string) $_GET['redirect']);
    }
    if ($address === '' && isset($_GET['address'])) {
        $address = trim((string) $_GET['address']);
    }
    if ($publicKey === '' && isset($_GET['public_key'])) {
        $publicKey = trim((string) $_GET['public_key']);
    }

    if ($redirect === '' || $address === '') {
        echo json_encode(['status' => 'error', 'error' => 'Missing redirect or account.address']);
        exit;
    }

    $requestCode = isset($_SESSION['request_code']) ? (string) $_SESSION['request_code'] : '';
    if ($requestCode === '') {
        echo json_encode([
            'status' => 'error',
            'error' => 'Missing request_code in session. Start login from the dapp top_login flow.'
        ]);
        exit;
    }

    $authData = [
        'account' => [
            'address' => $address,
            'public_key' => $publicKey,
        ],
        'redirect' => $redirect,
        'request_code' => $requestCode,
    ];

    $parts = parse_url($redirect);
    $queryParams = [];
    if (isset($parts['query'])) {
        parse_str($parts['query'], $queryParams);
    }
    $queryParams['auth_data'] = base64_encode(json_encode($authData));
    $newQuery = http_build_query($queryParams);
    $redirectUrl =
        (isset($parts['scheme']) ? $parts['scheme'] . '://' : '') .
        (isset($parts['host']) ? $parts['host'] : '') .
        (isset($parts['port']) ? ':' . $parts['port'] : '') .
        (isset($parts['path']) ? $parts['path'] : '') .
        ($newQuery !== '' ? '?' . $newQuery : '') .
        (isset($parts['fragment']) ? '#' . $parts['fragment'] : '');

    echo json_encode([
        'status' => 'ok',
        'data' => [
            'redirect_url' => $redirectUrl,
            'request_code' => $requestCode,
        ],
    ]);
    exit;
}

/** Clear legacy bridge session keys used by sessionlogin flow. */
if ($q === 'sessionLogoutClear') {
    unset($_SESSION['request_code']);
    unset($_SESSION['account']);
    @session_destroy();
    echo json_encode([
        'status' => 'ok',
        'data' => ['cleared' => true],
    ]);
    exit;
}

/** Set legacy dapps session account to currently active wallet account. */
if ($q === 'sessionSetAccount') {
    $address = isset($_POST['address']) ? trim((string) $_POST['address']) : '';
    $publicKey = isset($_POST['public_key']) ? trim((string) $_POST['public_key']) : '';
    if ($address === '') {
        echo json_encode(['status' => 'error', 'error' => 'Missing address']);
        exit;
    }
    $_SESSION['account'] = [
        'address' => $address,
        'public_key' => $publicKey,
    ];
    echo json_encode([
        'status' => 'ok',
        'data' => ['address' => $address],
    ]);
    exit;
}

// Test endpoint – call from frontend to verify wallet_api.php is reachable
if ($q === 'test') {
    echo json_encode([
        'status' => 'ok',
        'data'   => 'Hello from wallet_api.php',
        'time'   => date('c'),
    ]);
    exit;
}

// PHP Price – live USD from external coinInfo API; append daily close to local JSON → series = last 7 closes for sparkline
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
    $price = wallet_price_round(isset($info['usdPrice']) ? (float) $info['usdPrice'] : 0.0);
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
