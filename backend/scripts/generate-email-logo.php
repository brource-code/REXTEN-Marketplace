<?php

/**
 * Генерация PNG логотипа для писем (почтовые клиенты не показывают inline SVG).
 * Запуск: php scripts/generate-email-logo.php
 */

$size = 80;
$srcView = 30;

$im = imagecreatetruecolor($size, $size);
imagealphablending($im, false);
$transparent = imagecolorallocatealpha($im, 0, 0, 0, 127);
imagefill($im, 0, 0, $transparent);
imagealphablending($im, true);
imagesavealpha($im, true);

$s = static fn (float $x, float $y): array => [
    (int) round($x * $size / $srcView),
    (int) round($y * $size / $srcView),
];

$blue = imagecolorallocate($im, 37, 99, 235);
$blueMid = imagecolorallocate($im, 59, 130, 246);
$blueLight = imagecolorallocate($im, 96, 165, 250);

// Порядок как в SVG: сначала нижние слои, сверху — третий
$p1 = array_merge(...[$s(4, 8), $s(15, 2), $s(26, 8), $s(15, 14)]);
imagefilledpolygon($im, $p1, $blue);

$p2 = array_merge(...[$s(5, 16), $s(16, 10), $s(27, 16), $s(16, 22)]);
imagefilledpolygon($im, $p2, $blueMid);

$p3 = array_merge(...[$s(6, 24), $s(17, 18), $s(28, 24), $s(17, 30)]);
imagefilledpolygon($im, $p3, $blueLight);

$outDir = dirname(__DIR__) . '/public/images';
if (! is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}
$path = $outDir . '/rexten-logo.png';
imagepng($im, $path, 6);
imagedestroy($im);

echo "Written: {$path}\n";
