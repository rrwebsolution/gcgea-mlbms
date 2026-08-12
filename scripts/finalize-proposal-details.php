<?php
declare(strict_types=1);
require 'C:/xampp/htdocs/gcgea-backend/vendor/autoload.php';
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Console\Kernel;
$app=require 'C:/xampp/htdocs/gcgea-backend/bootstrap/app.php';$app->make(Kernel::class)->bootstrap();
$root=dirname(__DIR__);$source="$root/docs/proposal/GCGEA-MLBMS-System-Proposal-Detailed.docx";$docx="$root/docs/proposal/GCGEA-MLBMS-System-Proposal-Final.docx";$pdf="$root/docs/proposal/GCGEA-MLBMS-System-Proposal-Final.pdf";
copy($source,$docx);$zip=new ZipArchive();$zip->open($docx);$xml=$zip->getFromName('word/document.xml');$xml=str_replace([
 'GCGEA Membership, Loan and Benefits Management System (GCGEA MLBMS)',
 'Prepared for: [CLIENT / ORGANIZATION NAME]',
 'Prepared by: [SERVICE PROVIDER / DEVELOPER NAME]',
 'Proposal date: August 10, 2026',
 'September 9, 2026',
],[
 'Membership, Loan and Benefits Management System',
 'Prepared for: Gingoog City Government Employees Association',
 'Prepared by: Ryan Jay Reyes — Web Developer',
 'Proposal date: August 13, 2026',
 'September 12, 2026',
],$xml);$zip->addFromString('word/document.xml',$xml);$zip->close();
$logo='C:/xampp/htdocs/gcgea-backend/public/logo.png';$seal='C:/xampp/htdocs/gcgea-backend/public/city-seal-logo.png';
$pages='';foreach(range(2,8) as $page){$image="$root/.tmp-final-proposal-pages/page_{$page}_screenshot.png";$pages.='<section class="scan"><img src="'.$image.'"></section>';}
$html='<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}body{margin:0;font-family:DejaVu Sans,sans-serif;color:#172033}.cover{height:841.89px;box-sizing:border-box;padding:95px 70px;text-align:center;page-break-after:always}.logos{width:100%;margin-bottom:40px}.logos td{width:50%;text-align:center}.logo{width:105px;height:105px;object-fit:contain}.org{margin-top:6px;font-size:9px;color:#526173}.title{margin:24px 0 10px;color:#153d72;font-size:27px;font-weight:bold;line-height:1.25}.system{font-size:15px;font-weight:bold}.meta{width:72%;margin:48px auto 0;border-top:1px solid #b7c3d2;padding-top:20px;text-align:left;font-size:10px}.meta p{margin:8px 0}.scan{width:595.28px;height:841.89px;margin:0;padding:0;page-break-after:always;overflow:hidden}.scan img{display:block;width:595.28px;height:841.89px;margin:0;padding:0}</style></head><body><section class="cover"><table class="logos"><tr><td><img class="logo" src="'.$logo.'"></td><td><img class="logo" src="'.$seal.'"></td></tr></table><div class="org">GINGOOG CITY GOVERNMENT EMPLOYEES ASSOCIATION</div><div class="title">System Development and Implementation<br>Proposal</div><div class="system">Membership, Loan and Benefits Management System</div><div class="meta"><p><strong>Prepared for:</strong> Gingoog City Government Employees Association</p><p><strong>System:</strong> Membership, Loan and Benefits Management System</p><p><strong>Prepared by:</strong> Ryan Jay Reyes — Web Developer</p><p><strong>Proposal date:</strong> August 13, 2026</p><p><strong>Valid until:</strong> September 12, 2026</p></div></section>'.$pages.'</body></html>';
Pdf::loadHTML($html)->setPaper('a4','portrait')->save($pdf);echo "Final proposal generated.\n";
