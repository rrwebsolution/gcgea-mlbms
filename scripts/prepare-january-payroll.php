<?php

declare(strict_types=1);

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

require 'C:/xampp/htdocs/gcgea-backend/vendor/autoload.php';

$input = $argv[1] ?? null;
$output = $argv[2] ?? null;

if (! $input || ! is_file($input) || ! $output) {
    fwrite(STDERR, "Usage: php prepare-january-payroll.php <input.xlsx> <output.xlsx>\n");
    exit(1);
}

$reader = IOFactory::createReaderForFile($input);
$reader->setReadDataOnly(true);
$source = $reader->load($input);

$headers = [
    'member_number',
    'employee_number',
    'name',
    'loan_remarks',
    'principal',
    'interest',
    'principal_balance_previous',
    'interest_balance_previous',
    'current_month_loan_payment',
    'monthly_dues',
    'pabaon',
    'total_remit',
    'principal_balance_current',
    'interest_balance_current',
    'total_balance_current',
    'source_office',
];

$excludedSheets = [
    'summary of loan receivable',
    'interest income',
    'sheet1',
];

function cleanText(mixed $value): string
{
    return trim((string) preg_replace('/\s+/', ' ', (string) ($value ?? '')));
}

function amount(mixed $value): float
{
    if ($value === null || $value === '') {
        return 0.0;
    }
    if (is_numeric($value)) {
        return round((float) $value, 2);
    }
    $normalized = preg_replace('/[^0-9.\-]/', '', (string) $value);
    return is_numeric($normalized) ? round((float) $normalized, 2) : 0.0;
}

function nullableAmount(mixed $value): ?float
{
    return $value === null || $value === '' ? null : amount($value);
}

function isMemberName(string $name): bool
{
    if ($name === '') {
        return false;
    }
    $upper = strtoupper($name);
    return ! str_contains($upper, 'TOTAL MEMBER')
        && ! in_array($upper, ['TOTAL', 'GRAND TOTAL', 'SUBTOTAL', 'SUB-TOTAL'], true);
}

$records = [];
$sheetCounts = [];

foreach ($source->getWorksheetIterator() as $worksheet) {
    $sheetName = trim($worksheet->getTitle());
    if (in_array(strtolower($sheetName), $excludedSheets, true)) {
        continue;
    }

    $headerName = strtoupper(cleanText($worksheet->getCell('B1')->getValue()));
    $headerDues = strtoupper(cleanText($worksheet->getCell('J1')->getValue()));
    if (! str_contains($headerName, 'NAME') || ! str_contains($headerDues, 'DUES')) {
        continue;
    }

    $count = 0;
    for ($row = 2; $row <= $worksheet->getHighestDataRow(); $row++) {
        $name = cleanText($worksheet->getCell("B{$row}")->getValue());
        if (! isMemberName($name)) {
            continue;
        }

        $principal = amount($worksheet->getCell("H{$row}")->getCalculatedValue());
        $interest = amount($worksheet->getCell("I{$row}")->getCalculatedValue());
        $monthlyDues = amount($worksheet->getCell("J{$row}")->getCalculatedValue());
        $pabaon = amount($worksheet->getCell("K{$row}")->getCalculatedValue());
        $principalPrevious = nullableAmount($worksheet->getCell("F{$row}")->getCalculatedValue());
        $interestPrevious = nullableAmount($worksheet->getCell("G{$row}")->getCalculatedValue());
        $principalCurrent = nullableAmount($worksheet->getCell("M{$row}")->getCalculatedValue());
        $interestCurrent = nullableAmount($worksheet->getCell("N{$row}")->getCalculatedValue());

        // Completely empty historical rows are not payroll transactions.
        if ($principal === 0.0 && $interest === 0.0 && $monthlyDues === 0.0 && $pabaon === 0.0) {
            continue;
        }

        $loanPayment = round($principal + $interest, 2);
        $totalRemit = round($loanPayment + $monthlyDues + $pabaon, 2);
        $totalCurrent = ($principalCurrent === null && $interestCurrent === null)
            ? null
            : round(($principalCurrent ?? 0) + ($interestCurrent ?? 0), 2);

        $records[] = [
            '', // Source column A is only a row counter, not a member number.
            '',
            $name,
            cleanText($worksheet->getCell("C{$row}")->getValue()),
            $principal,
            $interest,
            $principalPrevious,
            $interestPrevious,
            $loanPayment,
            $monthlyDues,
            $pabaon,
            $totalRemit,
            $principalCurrent,
            $interestCurrent,
            $totalCurrent,
            $sheetName,
        ];
        $count++;
    }

    if ($count > 0) {
        $sheetCounts[$sheetName] = $count;
    }
}

$target = new Spreadsheet();
$sheet = $target->getActiveSheet();
$sheet->setTitle('Payroll Import');
$sheet->fromArray($headers, null, 'A1');
if ($records !== []) {
    $sheet->fromArray($records, null, 'A2');
}

$lastColumn = Coordinate::stringFromColumnIndex(count($headers));
$lastRow = max(2, count($records) + 1);
$sheet->freezePane('A2');
$sheet->setAutoFilter("A1:{$lastColumn}{$lastRow}");
$sheet->getStyle("A1:{$lastColumn}1")->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
$sheet->getStyle("A1:{$lastColumn}1")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF1E3A8A');
$sheet->getStyle("A1:{$lastColumn}1")->getAlignment()->setWrapText(true);
$sheet->getRowDimension(1)->setRowHeight(38);

foreach (range('A', $lastColumn) as $column) {
    $sheet->getColumnDimension($column)->setWidth(in_array($column, ['C', 'D', 'P'], true) ? 25 : 18);
}
foreach (['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'] as $column) {
    $sheet->getStyle("{$column}2:{$column}{$lastRow}")->getNumberFormat()->setFormatCode('₱#,##0.00');
}

$guide = $target->createSheet();
$guide->setTitle('Import Summary');
$guide->fromArray([
    ['Prepared Payroll Import', 'January 2026'],
    ['Source workbook', basename($input)],
    ['Member rows retained', count($records)],
    ['Office worksheets retained', count($sheetCounts)],
    ['Important', 'member_number and employee_number remain blank because the source workbook contains only row counters and names. The system will match by name; review unknown/ambiguous matches before committing.'],
    ['Important', 'source_office is an audit/reference column and will be ignored by the importer.'],
], null, 'A1');
$summaryRow = 8;
foreach ($sheetCounts as $office => $count) {
    $guide->setCellValue("A{$summaryRow}", $office);
    $guide->setCellValue("B{$summaryRow}", $count);
    $summaryRow++;
}
$guide->getColumnDimension('A')->setWidth(38);
$guide->getColumnDimension('B')->setWidth(90);
$guide->getStyle('A1:B1')->getFont()->setBold(true);

$writer = new Xlsx($target);
$writer->save($output);

echo json_encode([
    'output' => $output,
    'rows' => count($records),
    'officeSheets' => count($sheetCounts),
], JSON_UNESCAPED_SLASHES).PHP_EOL;

