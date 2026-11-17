<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

// 1. Detect environment automatically from incoming hostname
$httpHost = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
$isBetaHost = (strpos($httpHost, 'beta.') === 0) || (strpos($httpHost, 'beta') !== false) || (strpos($httpHost, 'localhost') !== false);

$defaultEnv = $isBetaHost ? 'beta' : 'production';
$defaultDomain = $isBetaHost ? 'beta.tambahq.in' : 'tambahq.in';

// 2. Load explicit config.php override if available
$configFile = __DIR__ . '/config.php';
$config = file_exists($configFile) ? require $configFile : [];

$appEnv = !empty($config['APP_ENV']) ? $config['APP_ENV'] : (getenv('APP_ENV') ?: $defaultEnv);
$appVersion = !empty($config['APP_VERSION']) ? $config['APP_VERSION'] : 'v2.0-beta';
$baseDomain = !empty($config['BASE_DOMAIN']) ? $config['BASE_DOMAIN'] : (getenv('BASE_DOMAIN') ?: $defaultDomain);

$connStr = !empty($config['NEON_DB_URL'])
    ? $config['NEON_DB_URL']
    : (getenv('NEON_DB_URL') ?: '');

$endpoint = !empty($config['NEON_ENDPOINT'])
    ? $config['NEON_ENDPOINT']
    : (getenv('NEON_ENDPOINT') ?: '');

// 3. Health / Environment metadata probe endpoint
if (isset($_GET['action']) && $_GET['action'] === 'info') {
    echo json_encode([
        'status' => 'ok',
        'env' => $appEnv,
        'version' => $appVersion,
        'base_domain' => $baseDomain,
        'db_endpoint' => parse_url($endpoint, PHP_URL_HOST)
    ]);
    exit;
}

// 4. Validate slug parameter
$slug = isset($_GET['slug']) ? trim(strtolower($_GET['slug'])) : '';
$slug = preg_replace('/[^a-z0-9-]/', '', $slug);

if (empty($slug) || strlen($slug) < 2) {
    http_response_code(400);
    echo json_encode(['exists' => false, 'error' => 'Invalid workspace identifier']);
    exit;
}

// 5. Query Neon SQL endpoint
$payload = json_encode([
    'query' => "SELECT slug, deployment_url, access_status FROM platform_companies WHERE slug = $1 AND access_status = 'active' LIMIT 1;",
    'params' => [$slug]
]);

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 4,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Neon-Connection-String: ' . $connStr
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $data = json_decode($response, true);
    if (!empty($data['rows']) && count($data['rows']) > 0) {
        $row = $data['rows'][0];
        $targetUrl = !empty($row['deployment_url']) ? $row['deployment_url'] : ('https://' . $slug . '.' . $baseDomain);
        echo json_encode([
            'slug' => $slug,
            'exists' => true,
            'url' => $targetUrl,
            'env' => $appEnv
        ]);
        exit;
    }
}

// Workspace not found in registered active companies
echo json_encode([
    'slug' => $slug,
    'exists' => false,
    'url' => null,
    'env' => $appEnv
]);
