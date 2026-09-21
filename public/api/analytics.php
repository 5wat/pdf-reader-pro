<?php
/**
 * ProPDF - Analytics API for InfinityFree PHP hosting
 * Supports visitor logging, sessions, and aggregated metrics.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$dataFile = $dataDir . '/analytics_store.json';
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Helper to load data
function loadStore($file) {
    if (!file_exists($file)) {
        return [
            'totalVisits' => 0,
            'sessions' => [],
            'events' => [],
            'referrers' => [],
            'devices' => ['desktop' => 0, 'mobile' => 0, 'tablet' => 0],
            'tools' => []
        ];
    }
    $raw = @file_get_contents($file);
    return json_decode($raw, true) ?: [];
}

// Helper to save data
function saveStore($file, $data) {
    // Keep max 1000 sessions to keep file lightweight on shared hosting
    if (isset($data['sessions']) && count($data['sessions']) > 1000) {
        $data['sessions'] = array_slice($data['sessions'], -1000);
    }
    if (isset($data['events']) && count($data['events']) > 2000) {
        $data['events'] = array_slice($data['events'], -2000);
    }
    @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    $store = loadStore($dataFile);

    if ($action === 'session_start' && is_array($payload)) {
        $store['totalVisits'] = ($store['totalVisits'] ?? 0) + 1;
        $device = $payload['device'] ?? 'desktop';
        if (isset($store['devices'][$device])) {
            $store['devices'][$device]++;
        } else {
            $store['devices'][$device] = 1;
        }

        $ref = $payload['referrer'] ?? 'Прямий перехід';
        $store['referrers'][$ref] = ($store['referrers'][$ref] ?? 0) + 1;

        $store['sessions'][] = [
            'id' => $payload['sessionId'] ?? uniqid('s_'),
            'vid' => $payload['visitorId'] ?? '',
            'time' => time(),
            'device' => $device,
            'os' => $payload['os'] ?? '',
            'browser' => $payload['browser'] ?? '',
            'referrer' => $ref,
            'duration' => 0
        ];
        saveStore($dataFile, $store);
        echo json_encode(['status' => 'ok', 'message' => 'session started']);
        exit;
    }

    if ($action === 'session_end' && is_array($payload)) {
        $sid = $payload['sessionId'] ?? '';
        $dur = intval($payload['durationSeconds'] ?? 0);
        if ($sid && isset($store['sessions'])) {
            foreach ($store['sessions'] as &$sess) {
                if ($sess['id'] === $sid) {
                    $sess['duration'] = $dur;
                    break;
                }
            }
            saveStore($dataFile, $store);
        }
        echo json_encode(['status' => 'ok', 'message' => 'session ended']);
        exit;
    }

    if ($action === 'event' && is_array($payload)) {
        if (($payload['category'] ?? '') === 'tool') {
            $tool = $payload['action'] ?? 'unknown';
            $store['tools'][$tool] = ($store['tools'][$tool] ?? 0) + 1;
        }
        $store['events'][] = [
            'time' => time(),
            'cat' => $payload['category'] ?? '',
            'act' => $payload['action'] ?? '',
            'val' => $payload['value'] ?? null
        ];
        saveStore($dataFile, $store);
        echo json_encode(['status' => 'ok', 'message' => 'event logged']);
        exit;
    }

    echo json_encode(['status' => 'ignored']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'stats') {
        $store = loadStore($dataFile);
        echo json_encode([
            'status' => 'ok',
            'data' => $store
        ]);
        exit;
    }
}

echo json_encode(['status' => 'online', 'service' => 'ProPDF Analytics']);
