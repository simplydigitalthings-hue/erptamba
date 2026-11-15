<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$slug = isset($_GET['slug']) ? trim(strtolower($_GET['slug'])) : '';
$slug = preg_replace('/[^a-z0-9-]/', '', $slug);

if (empty($slug) || strlen($slug) < 2) {
    http_response_code(400);
    echo json_encode(['exists' => false, 'error' => 'Invalid workspace identifier']);
    exit;
}

$connStr = "postgresql://neondb_owner:npg_cDAhNC0Y6Epu@ep-holy-union-az9dr80o-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
$endpoint = "https://ep-holy-union-az9dr80o.c-3.ap-southeast-1.aws.neon.tech/sql";

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
        $targetUrl = !empty($row['deployment_url']) ? $row['deployment_url'] : ('https://' . $slug . '.tambahq.in');
        echo json_encode([
            'slug' => $slug,
            'exists' => true,
            'url' => $targetUrl
        ]);
        exit;
    }
}

// Workspace not found in registered active companies
echo json_encode([
    'slug' => $slug,
    'exists' => false,
    'url' => null
]);
