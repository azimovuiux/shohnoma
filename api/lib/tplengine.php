<?php
declare(strict_types=1);

/*
 * HTML shablon dvigateli (docs/SHABLON-YORIQNOMA.md):
 *   {{key}}  {{#if key}}…{{else}}…{{/if}}  {{#unless key}}…{{/unless}}  {{#each list}}…{{/each}}
 *   each ichida: {{@index}} {{@number}} {{@first}} {{@last}} va qator ustunlari
 * Qiymatlar doim HTML-escape qilinadi. Kod bajarilmaydi.
 */

const TPL_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const TPL_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const TPL_INVITE_PHRASE = [
    'nikoh' => 'sizni to‘yimizga taklif qiladi',
    'fotiha' => 'sizni fotiha to‘yimizga taklif qiladi',
    'sunnat' => 'sunnat to‘yi munosabati bilan sizni taklif qilamiz',
    'tugilgan-kun' => 'sizni tug‘ilgan kunimga taklif qilaman',
];
/** Majburiy (har shablonda bor) belgilar */
const TPL_BASE_KEYS = ['personA', 'personB', 'names', 'initials', 'date', 'dateShort', 'day', 'month', 'monthName', 'year', 'weekday', 'time',
    'venueName', 'address', 'message', 'ceremonyLabel', 'invitePhrase', 'program', 'mapUrl'];

/** Matnni tokenlarga bo‘lib, daraxt quradi */
function tpl_parse(string $src): array
{
    preg_match_all('/\{\{\s*(#each|#if|#unless|\/each|\/if|\/unless|else)?\s*([@A-Za-z0-9_.]*)\s*\}\}/', $src, $m, PREG_OFFSET_CAPTURE | PREG_SET_ORDER);
    $tokens = [];
    $pos = 0;
    foreach ($m as $t) {
        [$full, $off] = $t[0];
        if ($off > $pos) $tokens[] = ['text', substr($src, $pos, $off - $pos)];
        $tokens[] = [($t[1][0] ?? '') === '' ? 'var' : $t[1][0], $t[2][0] ?? ''];
        $pos = $off + strlen($full);
    }
    if ($pos < strlen($src)) $tokens[] = ['text', substr($src, $pos)];
    $i = 0;
    [$children] = tpl_parse_block($tokens, $i, null);
    return ['type' => 'root', 'children' => $children];
}

/** $end — kutilayotgan yopilish turi (each/if/unless) yoki null (ildiz). Qaytaradi: [asosiy, else] */
function tpl_parse_block(array $tokens, int &$i, ?string $end): array
{
    $main = [];
    $else = null;
    $inElse = false;
    while ($i < count($tokens)) {
        [$k, $v] = $tokens[$i++];
        $node = null;
        if ($k === 'text') $node = ['type' => 'text', 'v' => $v];
        elseif ($k === 'var') $node = ['type' => 'var', 'name' => $v];
        elseif ($k === '#each' || $k === '#if' || $k === '#unless') {
            $type = substr($k, 1);
            if ($v === '') throw new RuntimeException("{{#$type}} da nom yo‘q");
            [$ch, $el] = tpl_parse_block($tokens, $i, $type);
            $node = ['type' => $type, 'name' => $v, 'children' => $ch, 'else' => $el];
        } elseif ($k === 'else') {
            if ($end === null || $inElse) throw new RuntimeException('{{else}} noto‘g‘ri joyda');
            $inElse = true;
            $else = [];
            continue;
        } else {
            $type = substr($k, 1);
            if ($type !== $end) throw new RuntimeException("{{/$type}} ga mos ochilish yo‘q");
            return [$main, $else];
        }
        if ($inElse) $else[] = $node;
        else $main[] = $node;
    }
    if ($end !== null) throw new RuntimeException("Yopilmagan blok: {{#$end}}");
    return [$main, $else];
}

function tpl_lookup(array $scopes, string $name): mixed
{
    for ($i = count($scopes) - 1; $i >= 0; $i--) {
        if (is_array($scopes[$i]) && array_key_exists($name, $scopes[$i])) return $scopes[$i][$name];
    }
    return null;
}

function tpl_truthy(mixed $v): bool
{
    if (is_array($v)) return count($v) > 0;
    if (is_string($v)) return trim($v) !== '';
    return (bool)$v;
}

function tpl_render_nodes(array $nodes, array $scopes): string
{
    $out = '';
    foreach ($nodes as $n) {
        switch ($n['type']) {
            case 'text':
                $out .= $n['v'];
                break;
            case 'var':
                $v = tpl_lookup($scopes, $n['name']);
                if (is_bool($v)) $v = $v ? 'true' : '';
                if (is_array($v)) $v = '';
                $out .= nl2br(htmlspecialchars((string)($v ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8'), false);
                break;
            case 'if':
            case 'unless':
                $ok = tpl_truthy(tpl_lookup($scopes, $n['name']));
                if ($n['type'] === 'unless') $ok = !$ok;
                $out .= tpl_render_nodes($ok ? $n['children'] : ($n['else'] ?? []), $scopes);
                break;
            case 'each':
                $list = tpl_lookup($scopes, $n['name']);
                if (!is_array($list) || !$list) {
                    $out .= tpl_render_nodes($n['else'] ?? [], $scopes);
                    break;
                }
                $list = array_values($list);
                $last = count($list) - 1;
                foreach ($list as $i => $row) {
                    $meta = ['@index' => $i, '@number' => $i + 1, '@first' => $i === 0, '@last' => $i === $last];
                    $out .= tpl_render_nodes($n['children'], [...$scopes, $meta, is_array($row) ? $row : ['this' => $row]]);
                }
                break;
        }
    }
    return $out;
}

function tpl_render(string $html, array $ctx): string
{
    return tpl_render_nodes(tpl_parse($html)['children'], [$ctx]);
}

/** Shablonda ishlatilgan barcha belgilar: ['vars' => [...], 'each' => [name => [cols]]] */
function tpl_used_keys(string $html): array
{
    $vars = [];
    $each = [];
    $walk = function (array $nodes, ?string $inEach) use (&$walk, &$vars, &$each) {
        foreach ($nodes as $n) {
            if ($n['type'] === 'var' || $n['type'] === 'if' || $n['type'] === 'unless') {
                if (!str_starts_with($n['name'], '@')) {
                    if ($inEach) $each[$inEach][] = $n['name'];
                    else $vars[] = $n['name'];
                }
            }
            if ($n['type'] === 'each') {
                $vars[] = $n['name'];
                $each[$n['name']] = $each[$n['name']] ?? [];
            }
            foreach (['children', 'else'] as $k) {
                if (!empty($n[$k])) $walk($n[$k], $n['type'] === 'each' ? $n['name'] : $inEach);
            }
        }
    };
    $walk(tpl_parse($html)['children'], null);
    return ['vars' => array_values(array_unique($vars)), 'each' => array_map(fn($c) => array_values(array_unique($c)), $each)];
}

/** Taklifnoma (yoki namuna) ma’lumotlaridan shablon konteksti */
function tpl_context(array $d): array
{
    $a = trim((string)($d['personA'] ?? ''));
    $b = trim((string)($d['personB'] ?? ''));
    $ctx = [
        'personA' => $a,
        'personB' => $b,
        'names' => $b !== '' ? "$a & $b" : $a,
        'initials' => trim(mb_strtoupper(mb_substr($a, 0, 1)) . ($b !== '' ? ' ' . mb_strtoupper(mb_substr($b, 0, 1)) : '')),
        'venueName' => (string)($d['venueName'] ?? ''),
        'address' => (string)($d['address'] ?? ''),
        'message' => (string)($d['message'] ?? ''),
        'mapUrl' => (string)($d['mapUrl'] ?? ''),
        'ceremonyLabel' => ceremony_label($d['ceremony'] ?? 'nikoh'),
        'invitePhrase' => TPL_INVITE_PHRASE[$d['ceremony'] ?? 'nikoh'] ?? '',
        'program' => $d['program'] ?? [],
        'date' => '', 'dateShort' => '', 'day' => '', 'month' => '', 'monthName' => '', 'year' => '', 'weekday' => '', 'time' => '',
    ];
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/', (string)($d['date'] ?? ''), $m)) {
        $mi = (int)$m[2];
        $ctx['day'] = $m[3];
        $ctx['month'] = $m[2];
        $ctx['year'] = $m[1];
        $ctx['monthName'] = TPL_MONTHS[$mi - 1] ?? '';
        $ctx['date'] = (int)$m[3] . ' ' . $ctx['monthName'] . ' ' . $m[1];
        $ctx['dateShort'] = "{$m[3]} · {$m[2]} · {$m[1]}";
        $ctx['weekday'] = TPL_WEEKDAYS[(int)date('w', gmmktime(12, 0, 0, $mi, (int)$m[3], (int)$m[1]))];
        $ctx['time'] = $m[4] ?? '';
    }
    foreach (($d['extra'] ?? []) as $k => $v) if (!in_array($k, TPL_BASE_KEYS, true) || $k === 'program') $ctx[$k] = $v;
    return $ctx;
}
