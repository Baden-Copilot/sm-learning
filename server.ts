import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_MATERIALS } from './src/data/materials';
import { MaterialItem } from './src/types';
import {
  initDb,
  readOutreachSessions,
  writeOutreachSessions,
  readOutreachReports,
  writeOutreachReports,
  readLearningEvents,
  writeLearningEvents,
  readSessionParticipants,
  writeSessionParticipants,
  readMaterialsData,
  writeMaterialsData,
  readLearningRecords,
  writeLearningRecords,
  readUserData,
  writeUserData,
  getPoldaList,
  getPolresList,
} from './src/db';

// Module-level pointer to materials (synced with db cache)
let materialsStore: MaterialItem[] = readMaterialsData();
let notificationsStore: any[] = [];

/**
 * Resolves the caller to a real, active account. Every personal record —
 * progress, favourites, history, profile — is keyed by this id, so defaulting a
 * missing header to a fixed user would let an anonymous request read and write
 * whichever account that default happens to be.
 */
function resolveCaller(req: any): { id: string; user: any } | null {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return null;
  const data = readUserData();
  const user = data.users.find((u: any) => u.id === userId);
  if (!user || !user.isActive) return null;
  return { id: userId, user };
}

// ---------------------------------------------------------------------------
// Certificate issuance & rendering (shared by logged-in learners and public
// participants of a trainer-run outreach session).
// ---------------------------------------------------------------------------

function formatDateId(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Issue a certificate, or return the one already issued for this holder+material.
 *
 * A holder is either a registered user (`userId`) or a public session participant
 * (`participantId` + `sessionId`), so the same material earns at most one
 * certificate per holder regardless of which route completed it.
 */
function issueCertificate(opts: {
  records: any;
  materialId: string;
  materialTitle: string;
  recipientName: string;
  score?: number | null;
  completionType: 'quiz' | 'material';
  userId?: string | null;
  participantId?: string | null;
  sessionId?: string | null;
  session?: any | null;
  institution?: string;
}) {
  const {
    records, materialId, materialTitle, recipientName, score = null,
    completionType, userId = null, participantId = null, sessionId = null,
    session = null, institution
  } = opts;

  const existing = records.certificates.find((c: any) =>
    c.materialId === materialId &&
    (participantId ? c.participantId === participantId : c.userId === userId)
  );
  if (existing) return existing;

  const nowIso = new Date().toISOString();
  const seq = records.certificates.length + 1;

  const cert = {
    certificateId: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    certificateNumber: `POLRI/DIKMAS/2026/${String(seq).padStart(6, '0')}`,
    userId,
    participantId,
    sessionId,
    recipientName,
    institution: institution || 'Korlantas POLRI',
    materialId,
    materialTitle,
    score,
    completionType,
    sessionName: session?.activityName || null,
    trainerName: session?.trainerName || null,
    trainerPosition: session?.trainerPosition || null,
    trainerUnit: session?.trainerUnit || null,
    polda: session?.polda || null,
    polres: session?.polres || null,
    completedAt: formatDateId(nowIso),
    issuedAt: formatDateId(nowIso),
    issuedAtIso: nowIso,
    isValid: true
  };

  records.certificates.push(cert);
  return cert;
}

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBase64Image(filePath: string): string {
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1) || 'png';
      return `data:image/${ext};base64,${fileData.toString('base64')}`;
    }
  } catch (err) {
    console.error(`Error loading image from ${filePath}:`, err);
  }
  return '';
}

function getPolriLogoBase64(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'polri.png'),
    path.join(process.cwd(), 'public', 'polri.png'),
    path.join(process.cwd(), 'dist', 'polri.png'),
    path.join(process.cwd(), 'src', 'data', 'polri.png'),
  ];
  for (const p of possiblePaths) {
    const data = getBase64Image(p);
    if (data) return data;
  }
  return '/polri.png';
}

function getKorlantasLogoBase64(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'korlantas-logo-new.png'),
    path.join(process.cwd(), 'public', 'korlantas-logo-new.png'),
    path.join(process.cwd(), 'dist', 'korlantas-logo-new.png'),
    path.join(process.cwd(), 'src', 'data', 'korlantas-logo-new.png'),
    path.join(process.cwd(), 'korlantas-logo.png'),
    path.join(process.cwd(), 'public', 'korlantas-logo.png')
  ];
  for (const p of possiblePaths) {
    const data = getBase64Image(p);
    if (data) return data;
  }
  return '/korlantas-logo-new.png';
}

function renderCertificateInnerHtml(cert: any, polriLogo: string, korlantasLogo: string): string {
  const e = escapeHtml;
  const verifyPath = `/api/certificates/verify/${encodeURIComponent(cert.certificateNumber)}`;

  const basisLine = cert.completionType === 'quiz'
    ? `telah menyelesaikan dan <strong>LULUS</strong> evaluasi pemahaman dengan pencapaian nilai <strong>${e(cert.score)}%</strong>`
    : 'telah menyelesaikan seluruh rangkaian materi pembelajaran edukasi keselamatan berlalu lintas';

  const sessionBlock = cert.sessionName
    ? `<div class="ctx-pill">
        <span class="ctx-badge">KEGIATAN RESMI</span>
        <span class="ctx-text">${e(cert.sessionName)}${
          cert.polda ? ` &bull; <strong>${e(cert.polda)}</strong>` : ''
        }${cert.polres ? ` &bull; ${e(cert.polres)}` : ''}</span>
      </div>`
    : '';

  const signerName = cert.trainerName || 'Korlantas POLRI';
  const signerRole = [cert.trainerPosition, cert.trainerUnit].filter(Boolean).join(' &bull; ')
    || 'Direktorat Keamanan dan Keselamatan Korlantas POLRI';

  return `
    <div class="sheet">
      <!-- Watermark Background Logo -->
      <div class="watermark" style="background-image: url('${korlantasLogo || polriLogo}');"></div>

      <!-- Outer & Inner Ornate Borders -->
      <div class="cert-border-outer">
        <div class="cert-border-inner">
          <!-- Grand Center Official Stamp / Seal (Background inside border) -->
          <div class="center-stamp-bg">
            <div class="grand-seal">
              <div class="grand-seal-inner">
                <div class="grand-seal-core">
                  <span class="grand-seal-top">&starf; KORPS LALU LINTAS &starf;</span>
                  <span class="grand-seal-mid">DIKMAS</span>
                  <span class="grand-seal-sub">DIREKTORAT KAMSEL</span>
                  <span class="grand-seal-bot">&starf; SAFETY EDUCATION &starf;</span>
                </div>
              </div>
            </div>
          </div>

          <div class="corner-ornament tl"></div>
          <div class="corner-ornament tr"></div>
          <div class="corner-ornament bl"></div>
          <div class="corner-ornament br"></div>

          <!-- Header with Dual Logos -->
          <div class="cert-header">
            <div class="logo-box left">
              ${polriLogo ? `<img src="${polriLogo}" alt="Logo POLRI" class="header-logo polri-logo" />` : ''}
            </div>
            <div class="header-center">
              <div class="inst-line1">KEPOLISIAN NEGARA REPUBLIK INDONESIA</div>
              <div class="inst-line2">KORPS LALU LINTAS</div>
              <div class="inst-line3">DIREKTORAT KEAMANAN DAN KESELAMATAN &bull; EDUKASI MASYARAKAT</div>
            </div>
            <div class="logo-box right">
              ${korlantasLogo ? `<img src="${korlantasLogo}" alt="Logo Korlantas" class="header-logo korlantas-logo" />` : ''}
            </div>
          </div>

          <div class="gold-divider">
            <span class="gold-star">&starf; &starf; &starf;</span>
          </div>

          <!-- Certificate Title -->
          <div class="cert-title-section">
            <div class="cert-pretitle">PIAGAM PENGHARGAAN &amp; KELULUSAN</div>
            <h1 class="cert-main-title">SERTIFIKAT KELULUSAN</h1>
            <div class="cert-num-badge">
              <span>NOMOR REGISTRASI: <strong>${e(cert.certificateNumber)}</strong></span>
            </div>
          </div>

          <!-- Certificate Body -->
          <div class="cert-body">
            <p class="cert-lead">Diberikan dengan kehormatan dan penghargaan kepada:</p>
            <div class="recipient-wrap">
              <div class="recipient-name">${e(cert.recipientName)}</div>
              ${cert.institution ? `<div class="recipient-org">${e(cert.institution)}</div>` : ''}
            </div>

            <p class="cert-basis">Yang bersangkutan ${basisLine} pada modul:</p>
            <div class="material-title-box">
              <div class="material-title">&ldquo;${e(cert.materialTitle)}&rdquo;</div>
            </div>

            ${sessionBlock}
          </div>

          <!-- Certificate Footer -->
          <div class="cert-footer">
            <div class="verify-section">
              <div class="qr-mock">
                <div class="qr-inner">
                  <div class="seal-icon">&check;</div>
                  <span>VERIFIED</span>
                </div>
              </div>
              <div class="verify-meta">
                <div class="verify-title">Autentikasi Sistem E-Learning POLRI</div>
                <div class="verify-line">ID: <code>${e(cert.certificateNumber)}</code></div>
                <div class="verify-line">Diterbitkan: <strong>${e(cert.issuedAt)}</strong></div>
                <div class="verify-sub">Dokumen sah terdaftar dalam database Korlantas POLRI</div>
              </div>
            </div>

            <div class="signature-section">
              <div class="sign-location-date">Jakarta, ${e(cert.issuedAt)}</div>
              <div class="sign-title">Penanggung Jawab / Instruktur Pelaksana</div>
              <div class="sign-space">
                <div class="sign-stamp-badge">TERVERIFIKASI ELEKTRONIK</div>
              </div>
              <div class="sign-name">${e(signerName)}</div>
              <div class="sign-role">${e(signerRole)}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

const CERTIFICATE_SHARED_CSS = `
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  body {
    margin: 0; background: #0f172a; color: #0a1d37;
    font-family: 'Cinzel', Georgia, 'Times New Roman', serif;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    min-height: 100vh; padding: 20px;
  }

  .sheet {
    width: 297mm; height: 210mm; min-height: 210mm; max-height: 210mm;
    background: #ffffff; position: relative; overflow: hidden;
    padding: 10mm; box-shadow: 0 25px 60px rgba(0,0,0,.45);
    display: flex; flex-direction: column; margin: 0 auto 30px auto;
  }

  .watermark {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 140mm; height: 140mm;
    background-size: contain; background-repeat: no-repeat; background-position: center;
    opacity: 0.055; pointer-events: none; z-index: 1;
  }

  /* GRAND CENTER OFFICIAL STAMP (BACKGROUND) */
  .center-stamp-bg {
    position: absolute; top: 54%; left: 50%;
    transform: translate(-50%, -50%) rotate(-12deg);
    pointer-events: none; z-index: 1; opacity: 0.22;
  }
  .grand-seal {
    width: 110mm; height: 110mm; border-radius: 50%;
    border: 4mm dashed #b8860b; padding: 3mm;
    display: flex; align-items: center; justify-content: center;
  }
  .grand-seal-inner {
    width: 100%; height: 100%; border: 2.5mm solid #0e2442; border-radius: 50%;
    outline: 1.2mm solid #b8860b; outline-offset: 2mm;
    display: flex; align-items: center; justify-content: center;
  }
  .grand-seal-core {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; font-family: Arial, sans-serif;
  }
  .grand-seal-top {
    font-size: 9pt; font-weight: 900; letter-spacing: 0.22em; color: #b8860b;
    text-transform: uppercase;
  }
  .grand-seal-mid {
    font-size: 32pt; font-weight: 950; letter-spacing: 0.18em; color: #0e2442;
    margin: 2mm 0 1mm; font-family: 'Cinzel', Georgia, serif;
    border-top: 2px solid #b8860b; border-bottom: 2px solid #b8860b;
    padding: 1.5mm 8mm;
  }
  .grand-seal-sub {
    font-size: 8.5pt; font-weight: 800; letter-spacing: 0.18em; color: #0e2442;
    text-transform: uppercase; margin-top: 1.5mm;
  }
  .grand-seal-bot {
    font-size: 8pt; font-weight: 800; letter-spacing: 0.2em; color: #b8860b;
    text-transform: uppercase; margin-top: 2mm;
  }

  .cert-border-outer {
    position: relative; z-index: 2; width: 100%; height: 100%;
    border: 3.5mm solid #0e2442;
    padding: 2.5mm; background: #ffffff;
  }

  .cert-border-inner {
    position: relative; width: 100%; height: 100%;
    border: 1.2mm solid #b8860b;
    outline: 0.5mm solid #daa520; outline-offset: 1.5mm;
    padding: 6mm 10mm;
    display: flex; flex-direction: column; justify-content: space-between;
    background: radial-gradient(circle at center, #ffffff 60%, #faf8f2 100%);
  }

  .corner-ornament {
    position: absolute; width: 16mm; height: 16mm;
    border-color: #b8860b; border-style: solid; pointer-events: none;
  }
  .corner-ornament.tl { top: 2mm; left: 2mm; border-width: 2px 0 0 2px; }
  .corner-ornament.tr { top: 2mm; right: 2mm; border-width: 2px 2px 0 0; }
  .corner-ornament.bl { bottom: 2mm; left: 2mm; border-width: 0 0 2px 2px; }
  .corner-ornament.br { bottom: 2mm; right: 2mm; border-width: 0 2px 2px 0; }

  /* HEADER */
  .cert-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12mm; padding-bottom: 2mm;
  }
  .logo-box { width: 26mm; height: 26mm; display: flex; align-items: center; justify-content: center; }
  .header-logo { max-width: 26mm; max-height: 26mm; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,.15)); }
  .header-center { text-align: center; flex: 1; }
  .inst-line1 { font-size: 11pt; font-weight: 800; letter-spacing: 0.22em; color: #0e2442; text-transform: uppercase; }
  .inst-line2 { font-size: 13pt; font-weight: 900; letter-spacing: 0.16em; color: #b8860b; text-transform: uppercase; margin-top: 1mm; }
  .inst-line3 { font-size: 7.5pt; font-weight: 600; letter-spacing: 0.14em; color: #475569; text-transform: uppercase; margin-top: 1.5mm; font-family: Arial, sans-serif; }

  .gold-divider {
    text-align: center; position: relative; margin: 1mm 0 2mm;
    border-bottom: 1px solid #b8860b; height: 6px;
  }
  .gold-star {
    position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
    background: #fff; padding: 0 8px; color: #b8860b; font-size: 9pt; letter-spacing: 4px;
  }

  /* TITLE */
  .cert-title-section { text-align: center; margin-top: 1mm; }
  .cert-pretitle { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.35em; color: #64748b; text-transform: uppercase; font-family: Arial, sans-serif; }
  .cert-main-title {
    font-size: 23pt; font-weight: 900; letter-spacing: 0.08em;
    color: #0e2442; margin: 1mm 0; text-transform: uppercase;
    text-shadow: 0 1px 2px rgba(0,0,0,.08);
  }
  .cert-num-badge {
    display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1;
    border-radius: 4px; padding: 1.5mm 6mm; font-family: 'Courier New', Courier, monospace;
    font-size: 8.5pt; color: #334155; letter-spacing: 0.08em;
  }

  /* BODY */
  .cert-body { text-align: center; margin-top: 2mm; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .cert-lead { font-size: 9.5pt; color: #475569; margin: 0; font-style: italic; font-family: Georgia, serif; }
  .recipient-wrap { margin: 2mm 0 1mm; }
  .recipient-name {
    font-size: 21pt; font-weight: 800; color: #0e2442;
    display: inline-block; padding: 0 12mm 1mm;
    border-bottom: 2px solid #b8860b; letter-spacing: 0.03em;
  }
  .recipient-org { font-size: 9.5pt; font-weight: 600; color: #64748b; margin-top: 1.5mm; font-family: Arial, sans-serif; }

  .cert-basis { font-size: 9.5pt; color: #334155; margin: 2mm 0 1mm; line-height: 1.4; }
  .material-title-box { margin: 1mm 0; }
  .material-title { font-size: 13pt; font-weight: 800; color: #0e2442; letter-spacing: 0.02em; }

  .ctx-pill {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 999px;
    padding: 1.5mm 6mm; margin: 2mm auto 0; max-width: 85%;
    font-family: Arial, sans-serif; font-size: 8pt; color: #334155;
  }
  .ctx-badge { background: #0e2442; color: #fff; font-size: 6.5pt; font-weight: 800; padding: 1px 5px; border-radius: 4px; letter-spacing: 0.05em; }

  /* FOOTER */
  .cert-footer {
    display: flex; justify-content: space-between; align-items: flex-end;
    margin-top: 2mm; padding-top: 2mm;
  }
  .verify-section { display: flex; align-items: center; gap: 3.5mm; text-align: left; max-width: 85mm; }
  .qr-mock {
    width: 17mm; height: 17mm; border: 1.5px solid #0e2442; border-radius: 4px;
    display: flex; align-items: center; justify-content: center; background: #f8fafc;
    flex-shrink: 0;
  }
  .qr-inner { text-align: center; font-family: Arial, sans-serif; font-size: 6pt; font-weight: 800; color: #0e2442; }
  .seal-icon { font-size: 11pt; color: #16a34a; font-weight: 900; line-height: 1; }

  .verify-meta { font-family: Arial, sans-serif; font-size: 7pt; color: #475569; line-height: 1.4; }
  .verify-title { font-weight: 800; color: #0e2442; font-size: 7.5pt; text-transform: uppercase; }
  .verify-line code { font-family: monospace; color: #0f172a; font-weight: 700; }
  .verify-sub { font-size: 6pt; color: #94a3b8; margin-top: 1px; }

  .stamp-seal-box { display: flex; align-items: center; justify-content: center; }
  .official-seal {
    width: 22mm; height: 22mm; border-radius: 50%;
    border: 2px dashed #b8860b; padding: 1.5mm;
    display: flex; align-items: center; justify-content: center;
    opacity: 0.85; transform: rotate(-8deg);
  }
  .seal-circle {
    width: 100%; height: 100%; border: 1px solid #b8860b; border-radius: 50%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: Arial, sans-serif; color: #b8860b; text-align: center;
  }
  .seal-top { font-size: 4.5pt; font-weight: 800; letter-spacing: 0.5px; }
  .seal-mid { font-size: 6.5pt; font-weight: 900; margin: 1px 0; color: #0e2442; }
  .seal-bot { font-size: 4pt; font-weight: 700; letter-spacing: 0.3px; }

  .signature-section { text-align: center; font-family: Arial, sans-serif; min-width: 65mm; }
  .sign-location-date { font-size: 8pt; color: #334155; font-weight: 600; }
  .sign-title { font-size: 7.5pt; color: #64748b; margin-top: 1px; }
  .sign-space { height: 13mm; display: flex; align-items: center; justify-content: center; position: relative; }
  .sign-stamp-badge {
    border: 1px solid #16a34a; background: #f0fdf4; color: #15803d;
    font-size: 6pt; font-weight: 800; padding: 2px 6px; border-radius: 3px;
    letter-spacing: 0.08em; transform: rotate(-4deg);
  }
  .sign-name {
    font-size: 9.5pt; font-weight: 800; color: #0e2442;
    border-top: 1.5px solid #0e2442; padding-top: 1.5mm;
  }
  .sign-role { font-size: 7.5pt; color: #64748b; margin-top: 1px; max-width: 70mm; }

  .bar {
    position: fixed; top: 0; left: 0; right: 0; background: #0a1d37; color: #fff;
    font-family: Arial, Helvetica, sans-serif; font-size: 13px; padding: 12px 20px;
    display: flex; justify-content: center; gap: 16px; align-items: center; z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,.3);
  }
  .bar button {
    font: inherit; font-weight: 700; cursor: pointer; border: 0; border-radius: 8px;
    padding: 8px 20px; background: #b8860b; color: #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,.2); transition: background 0.2s;
  }
  .bar button:hover { background: #d4a017; }

  @media print {
    .bar { display: none !important; }
    body { background: #fff !important; padding: 0 !important; }
    .sheet {
      box-shadow: none !important; margin: 0 !important;
      page-break-after: always !important; page-break-inside: avoid !important;
      width: 297mm !important; height: 210mm !important;
    }
  }
`;

/**
 * Render a certificate as a standalone, self-contained, print-ready A4 landscape
 * page. Opening it and using the browser's "Save as PDF" produces the official
 * document; no client-side PDF dependency is required.
 */
function renderCertificateHtml(cert: any): string {
  const e = escapeHtml;
  const polriLogo = getPolriLogoBase64();
  const korlantasLogo = getKorlantasLogoBase64();
  const certHtml = renderCertificateInnerHtml(cert, polriLogo, korlantasLogo);

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sertifikat ${e(cert.certificateNumber)} - ${e(cert.recipientName)}</title>
<style>
${CERTIFICATE_SHARED_CSS}
</style>
</head>
<body>
  <div class="bar">
    <span>Gunakan tombol berikut, lalu pilih printer atau <strong>Save as PDF</strong> (Ukuran A4 Landscape).</span>
    <button onclick="window.print()">&starf; Cetak / Simpan PDF</button>
  </div>

  ${certHtml}
</body>
</html>`;
}

// RBAC Middleware Helper
function verifyAuthAndRole(menuId: string, requiredAction: 'view' | 'add' | 'edit' | 'delete') {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string;

    const userData = readUserData();
    const user = userData.users.find((u: any) => u.id === userId);

    // Identity must come from a real, active account. Trusting the x-role-id
    // header on its own would let any caller claim "role-admin" and walk
    // straight past every permission check below.
    if (!userId || !user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Akun pengguna tidak ditemukan atau dinonaktifkan.'
      });
    }

    // The account's stored role is authoritative; the header is only a hint and
    // is ignored when it disagrees.
    const effectiveRoleId = user.roleId;
    const role = userData.roles.find((r: any) => r.id === effectiveRoleId);

    if (effectiveRoleId === 'role-admin') {
      return next();
    }

    if (!role) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Role tidak valid.'
      });
    }

    const menuPerm = role.permissions?.find((p: any) => p.menuId === menuId);
    if (!menuPerm || !menuPerm.actions?.includes(requiredAction)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Peran "${role.name}" tidak memiliki izin "${requiredAction}" pada menu "${menuId}".`
      });
    }

    next();
  };
}

async function startServer() {
  // Inisialisasi pool MySQL & hidrasi cache
  try {
    await initDb();
    materialsStore = readMaterialsData();
  } catch (err) {
    console.error('[DB] Gagal inisialisasi database MySQL:', err);
  }

  const app = express();
  const PORT = 4003;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'E-Learning Safety Education POLRI Server',
      db: 'mysql',
      timestamp: new Date().toISOString()
    });
  });

  // Master Data Wilayah (Polda & Polres dari data_polda & data_polres)
  app.get('/api/wilayah/polda', (_req, res) => {
    const poldas = getPoldaList();
    res.json({ success: true, data: poldas });
  });

  app.get('/api/wilayah/polres', (req, res) => {
    const poldaId = req.query.poldaId ? String(req.query.poldaId) : undefined;
    const polres = getPolresList(poldaId);
    res.json({ success: true, data: polres });
  });

  // Public Catalog for Umum (/umum portal)
  app.get('/api/public/materials', (req, res) => {
    const { level, type, q, sort, limit } = req.query;

    let filtered = materialsStore.filter(
      item => (item.publishStatus || 'published') === 'published' && item.publicAccess !== 'restricted'
    );

    if (level && level !== 'ALL') {
      filtered = filtered.filter(item => item.level.toUpperCase() === String(level).toUpperCase());
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(item => item.type.toLowerCase() === String(type).toLowerCase());
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const search = q.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.level.toLowerCase().includes(search) ||
        item.typeLabel.toLowerCase().includes(search) ||
        (item.author && item.author.toLowerCase().includes(search))
      );
    }

    if (sort === 'popular') {
      filtered.sort((a, b) => b.views - a.views);
    } else if (sort === 'downloads') {
      filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sort === 'az') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Strip quiz answers & server secrets for public library
    const publicSafe = filtered.map(item => ({
      ...item,
      quiz: undefined
    }));

    const totalCount = publicSafe.length;
    let resultData = publicSafe;

    if (limit) {
      const numLimit = parseInt(String(limit), 10);
      if (!isNaN(numLimit)) {
        resultData = resultData.slice(0, numLimit);
      }
    }

    res.json({
      success: true,
      total: totalCount,
      count: resultData.length,
      data: resultData
    });
  });

  // Get catalog materials with filtering, search, and sorting
  app.get('/api/materials', (req, res) => {
    const { level, type, q, sort, limit } = req.query;

    let filtered = [...materialsStore];

    if (level && level !== 'ALL') {
      filtered = filtered.filter(item => item.level.toUpperCase() === String(level).toUpperCase());
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(item => item.type.toLowerCase() === String(type).toLowerCase());
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const search = q.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.level.toLowerCase().includes(search) ||
        item.typeLabel.toLowerCase().includes(search) ||
        (item.author && item.author.toLowerCase().includes(search))
      );
    }

    if (sort === 'popular') {
      filtered.sort((a, b) => b.views - a.views);
    } else if (sort === 'downloads') {
      filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sort === 'az') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    const totalCount = filtered.length;

    if (limit) {
      const numLimit = parseInt(String(limit), 10);
      if (!isNaN(numLimit)) {
        filtered = filtered.slice(0, numLimit);
      }
    }

    const userId = req.headers['x-user-id'] as string;
    let records: any = null;
    if (userId) {
      records = readLearningRecords();
    }

    // Progress, favourites and lesson ticks belong to the caller, not to the
    // catalog. Anything read off materialsStore here would be one person's
    // state shown to everyone, so the per-user record always overrides it.
    let enriched = filtered.map(item => {
      const userProg = userId && records
        ? records.userProgress?.find((p: any) => p.userId === userId && p.materialId === item.id)
        : null;
      const isBookmarked = userId && records
        ? records.userBookmarks?.some((b: any) => b.userId === userId && b.materialId === item.id)
        : false;
      const doneLessons = new Set<string>(userProg?.completedLessonIds || []);
      return {
        ...item,
        progressPercent: userProg ? userProg.progressPercent : 0,
        status: userProg ? userProg.status : 'not_started',
        bookmarked: !!isBookmarked,
        isBookmarked: !!isBookmarked,
        modules: item.modules?.map(mod => ({
          ...mod,
          lessons: mod.lessons.map(les => ({ ...les, isCompleted: doneLessons.has(les.id) }))
        }))
      };
    });

    res.json({
      success: true,
      total: totalCount,
      count: enriched.length,
      data: enriched
    });
  });

  // Get single material detail
  app.get('/api/materials/:id', (req, res) => {
    const { id } = req.params;
    const material = materialsStore.find(item => item.id === id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      const records = readLearningRecords();
      const userProg = records.userProgress?.find((p: any) => p.userId === userId && p.materialId === id);
      const isBookmarked = records.userBookmarks?.some((b: any) => b.userId === userId && b.materialId === id);
      return res.json({
        success: true,
        data: {
          ...material,
          progressPercent: userProg ? userProg.progressPercent : 0,
          status: userProg ? userProg.status : 'not_started',
          isBookmarked: !!isBookmarked
        }
      });
    }

    return res.json({ success: true, data: material });
  });

  // Create new material (Requires add permission on content-management or katalog)
  app.post('/api/materials', verifyAuthAndRole('content-management', 'add'), (req, res) => {
    const newMaterial = req.body;
    if (!newMaterial.title || typeof newMaterial.title !== 'string' || !newMaterial.level || !newMaterial.type) {
      return res.status(400).json({ success: false, message: 'Judul, jenjang, dan format materi wajib diisi dengan benar.' });
    }
    const createdItem: MaterialItem = {
      ...newMaterial,
      id: newMaterial.id || `mat-${Date.now()}`,
      views: typeof newMaterial.views === 'number' ? newMaterial.views : 0,
      downloads: typeof newMaterial.downloads === 'number' ? newMaterial.downloads : 0,
      publishStatus: ['published', 'draft', 'archived'].includes(newMaterial.publishStatus) ? newMaterial.publishStatus : 'published',
      publishDate: newMaterial.publishDate || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    };
    materialsStore.unshift(createdItem);
    writeMaterialsData(materialsStore);
    res.json({ success: true, data: createdItem, message: 'Materi berhasil ditambahkan.' });
  });

  // Update existing material (Requires edit permission)
  app.put('/api/materials/:id', verifyAuthAndRole('content-management', 'edit'), (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Materi tidak ditemukan.' });
    }
    materialsStore[index] = {
      ...materialsStore[index],
      ...updatedData,
      id, // keep immutable original id
    };
    writeMaterialsData(materialsStore);
    res.json({ success: true, data: materialsStore[index], message: 'Materi berhasil diperbarui.' });
  });

  // Delete material (Requires delete permission)
  app.delete('/api/materials/:id', verifyAuthAndRole('content-management', 'delete'), (req, res) => {
    const { id } = req.params;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Materi tidak ditemukan.' });
    }
    const deleted = materialsStore.splice(index, 1);
    writeMaterialsData(materialsStore);
    res.json({ success: true, data: deleted[0], message: 'Materi berhasil dihapus.' });
  });

  // Increment views
  app.post('/api/materials/:id/view', (req, res) => {
    const { id } = req.params;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index !== -1) {
      materialsStore[index].views += 1;
      return res.json({ success: true, views: materialsStore[index].views });
    }
    return res.status(404).json({ success: false, message: 'Material not found' });
  });

  // Increment downloads
  app.post('/api/materials/:id/download', (req, res) => {
    const { id } = req.params;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index !== -1) {
      materialsStore[index].downloads = (materialsStore[index].downloads || 0) + 1;
      return res.json({ success: true, downloads: materialsStore[index].downloads });
    }
    return res.status(404).json({ success: false, message: 'Material not found' });
  });

  // Toggle bookmark
  // A favourite belongs to one account. Toggling a flag on materialsStore would
  // publish it to every visitor, so the toggle is stored per user instead.
  app.post('/api/materials/:id/bookmark', (req, res) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;
    if (!materialsStore.some(item => item.id === id)) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    if (!userId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login untuk menyimpan favorit.' });
    }

    const records = readLearningRecords();
    const existingIndex = records.userBookmarks.findIndex((b: any) => b.userId === userId && b.materialId === id);
    let bookmarked: boolean;
    if (existingIndex !== -1) {
      records.userBookmarks.splice(existingIndex, 1);
      bookmarked = false;
    } else {
      records.userBookmarks.push({ userId, materialId: id, createdAt: new Date().toISOString() });
      bookmarked = true;
    }
    writeLearningRecords(records);
    return res.json({ success: true, bookmarked });
  });

  // Update learning progress & lesson completion
  app.post('/api/materials/:id/progress', (req, res) => {
    const { id } = req.params;
    const { progressPercent, status, completedLessonId } = req.body;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    // Progress is per learner. Writing it onto materialsStore would make one
    // person's completed lessons show up as everybody's, so it goes into that
    // account's own record and is merged back only for the caller.
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login untuk menyimpan progres belajar.' });
    }

    const records = readLearningRecords();
    const pIndex = records.userProgress.findIndex((p: any) => p.userId === userId && p.materialId === id);
    const nowIso = new Date().toISOString();
    const clamped = typeof progressPercent === 'number'
      ? Math.min(100, Math.max(0, progressPercent))
      : undefined;

    if (pIndex === -1) {
      records.userProgress.push({
        userId,
        materialId: id,
        progressPercent: clamped ?? 0,
        status: status || 'in_progress',
        completedLessonIds: completedLessonId ? [completedLessonId] : [],
        lastAccessedAt: nowIso
      });
    } else {
      const prev = records.userProgress[pIndex];
      const lessons = new Set<string>(prev.completedLessonIds || []);
      if (completedLessonId) lessons.add(completedLessonId);
      records.userProgress[pIndex] = {
        ...prev,
        progressPercent: clamped ?? prev.progressPercent,
        status: status || prev.status,
        completedLessonIds: Array.from(lessons),
        lastAccessedAt: nowIso
      };
    }
    writeLearningRecords(records);

    const saved = records.userProgress.find((p: any) => p.userId === userId && p.materialId === id);
    const doneLessons = new Set<string>(saved?.completedLessonIds || []);
    const bookmarked = records.userBookmarks?.some((b: any) => b.userId === userId && b.materialId === id);

    return res.json({
      success: true,
      data: {
        ...materialsStore[index],
        progressPercent: saved?.progressPercent ?? 0,
        status: saved?.status ?? 'not_started',
        bookmarked: !!bookmarked,
        isBookmarked: !!bookmarked,
        modules: materialsStore[index].modules?.map(mod => ({
          ...mod,
          lessons: mod.lessons.map(les => ({ ...les, isCompleted: doneLessons.has(les.id) }))
        }))
      }
    });
  });

  // Stats summary
  app.get('/api/stats', (_req, res) => {
    const totalMaterials = materialsStore.length;
    const totalViews = materialsStore.reduce((acc, curr) => acc + curr.views, 0);
    const totalDownloads = materialsStore.reduce((acc, curr) => acc + (curr.downloads || 0), 0);
    const countsByLevel = {
      'TK/PAUD': materialsStore.filter(m => m.level === 'TK/PAUD').length,
      'SD': materialsStore.filter(m => m.level === 'SD').length,
      'SMP': materialsStore.filter(m => m.level === 'SMP').length,
      'SMA': materialsStore.filter(m => m.level === 'SMA').length
    };

    res.json({
      success: true,
      data: {
        totalMaterials,
        totalViews,
        totalDownloads,
        countsByLevel
      }
    });
  });

  // Notifications API
  app.get('/api/notifications', (_req, res) => {
    res.json({ success: true, data: notificationsStore });
  });

  app.post('/api/notifications/mark-read', (_req, res) => {
    notificationsStore = notificationsStore.map(n => ({ ...n, read: true }));
    res.json({ success: true, data: notificationsStore });
  });

  // === USER ACCESS & AUTH API ===

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const data = readUserData();
    const user = data.users.find((u: any) => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan. Hubungi Super Admin.' });
    }

    const role = data.roles.find((r: any) => r.id === user.roleId);

    // Return safe user data (without password)
    const { password: _, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, role } });
  });

  // Role definitions only, for any signed-in account. The client needs live
  // permissions to render its menus; without this a trainer or executive would
  // fall back to the hardcoded defaults and never see an admin's edits.
  app.get('/api/user-access/my-permissions', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const data = readUserData();
    const user = data.users.find((u: any) => u.id === userId);

    if (!userId || !user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Akun pengguna tidak ditemukan atau dinonaktifkan.'
      });
    }

    const role = data.roles.find((r: any) => r.id === user.roleId) || null;
    const { password: _pw, ...safeUser } = user;
    return res.json({ success: true, data: { user: safeUser, role, roles: data.roles } });
  });

  // Get all users & roles (Requires view permission on user-akses or role-admin)
  app.get('/api/user-access/data', verifyAuthAndRole('user-akses', 'view'), (_req, res) => {
    const data = readUserData();
    // Sanitize user passwords before sending to client
    const sanitizedUsers = data.users.map((u: any) => {
      const { password: _, ...rest } = u;
      return rest;
    });
    res.json({ success: true, data: { ...data, users: sanitizedUsers } });
  });

  // Save all users (Requires edit permission on user-akses or role-admin)
  app.post('/api/user-access/users', verifyAuthAndRole('user-akses', 'edit'), (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ success: false, message: 'Data pengguna tidak valid.' });
    }

    // Input validation for each user item
    for (const u of users) {
      if (!u.id || !u.username || !u.fullName || !u.roleId) {
        return res.status(400).json({
          success: false,
          message: 'Format data pengguna tidak lengkap: id, username, fullName, dan roleId wajib ada.'
        });
      }
    }

    const data = readUserData();
    // Preserve existing passwords if incoming payload doesn't provide new password
    const updatedUsers = users.map((incoming: any) => {
      const existing = data.users.find((u: any) => u.id === incoming.id);
      return {
        ...incoming,
        password: incoming.password && incoming.password.trim() ? incoming.password : (existing?.password || '123456'),
        isActive: typeof incoming.isActive === 'boolean' ? incoming.isActive : true,
      };
    });

    data.users = updatedUsers;
    writeUserData(data);
    res.json({ success: true, message: 'Daftar pengguna berhasil disimpan.' });
  });

  // Save all roles (Requires edit permission on user-akses or role-admin)
  app.post('/api/user-access/roles', verifyAuthAndRole('user-akses', 'edit'), (req, res) => {
    const { roles } = req.body;
    if (!Array.isArray(roles)) {
      return res.status(400).json({ success: false, message: 'Data role tidak valid.' });
    }

    for (const r of roles) {
      if (!r.id || !r.name || !Array.isArray(r.permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Format data role tidak lengkap: id, name, dan permissions wajib ada.'
        });
      }
    }

    const data = readUserData();
    data.roles = roles;
    writeUserData(data);
    res.json({ success: true, message: 'Daftar role berhasil disimpan.' });
  });

  // === LEARNING RECORDS & REAL PERSISTENCE API ===

  // Get learning records for active user
  app.get('/api/learning-records', (req, res) => {
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const userId = caller.id;
    const records = readLearningRecords();

    // Filter data specifically for calling user
    const userProgress = records.userProgress.filter((p: any) => p.userId === userId);
    const quizAttempts = records.quizAttempts.filter((q: any) => q.userId === userId);
    const certificates = records.certificates.filter((c: any) => c.userId === userId);
    const userBookmarks = records.userBookmarks.filter((b: any) => b.userId === userId);
    const userHistory = records.userHistory.filter((h: any) => h.userId === userId);

    res.json({
      success: true,
      data: {
        userId,
        userProgress,
        quizAttempts,
        certificates,
        userBookmarks,
        userHistory,
        auditLogs: records.auditLogs || [],
        notifications: records.notifications || []
      }
    });
  });

  // Submit Quiz & Issue Certificate
  app.post('/api/quiz/submit', (req, res) => {
    const userId = req.headers['x-user-id'] as string;

    // A certificate carries a person's name, so the identity behind it has to be
    // a real signed-in account — not a default that would file an anonymous
    // attempt under someone else's record.
    const submitterData = readUserData();
    const submitter = submitterData.users.find((u: any) => u.id === userId);
    if (!userId || !submitter || !submitter.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Silakan login terlebih dahulu untuk mengikuti evaluasi kelulusan.'
      });
    }

    // Executives inspect materials in review mode — they do not submit learner evaluations
    if (submitter.roleId === 'role-executive') {
      return res.status(403).json({
        success: false,
        message: 'Akun pimpinan/eksekutif hanya memiliki akses peninjauan materi, bukan pengisian evaluasi kelulusan.'
      });
    }

    const { materialId, answers, passingGrade = 70 } = req.body;

    if (!materialId) {
      return res.status(400).json({ success: false, message: 'Data submission kuis tidak lengkap.' });
    }

    const material = materialsStore.find(m => m.id === materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Materi kursus tidak ditemukan.' });
    }

    const questions = (material.quiz && material.quiz.length > 0) ? material.quiz : [
      { id: 1, correctIndex: 1 },
      { id: 2, correctIndex: 1 }
    ];

    // Server-side strict evaluation: Never trust client score parameter
    let correctCount = 0;
    if (answers && typeof answers === 'object') {
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correctIndex || answers[q.id] === q.correctIndex) {
          correctCount += 1;
        }
      });
    }
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= passingGrade;
    const nowIso = new Date().toISOString();

    const records = readLearningRecords();
    const recipientName = submitter.fullName || 'Peserta Dikmas Lantas POLRI';

    // Record quiz attempt
    const newAttempt = {
      attemptId: `att-${Date.now()}`,
      userId,
      materialId,
      score,
      passed,
      passingGrade,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      completedAt: nowIso
    };
    records.quizAttempts.push(newAttempt);

    // Update user progress
    let existingProgressIndex = records.userProgress.findIndex((p: any) => p.userId === userId && p.materialId === materialId);
    if (existingProgressIndex === -1) {
      records.userProgress.push({
        userId,
        materialId,
        progressPercent: passed ? 100 : 75,
        status: passed ? 'completed' : 'in_progress',
        completedLessonIds: ['les-1', 'les-2', 'les-3'],
        lastAccessedAt: nowIso
      });
    } else {
      const current = records.userProgress[existingProgressIndex];
      records.userProgress[existingProgressIndex] = {
        ...current,
        progressPercent: passed ? 100 : Math.max(current.progressPercent || 0, 75),
        status: passed ? 'completed' : current.status,
        lastAccessedAt: nowIso
      };
    }

    // Issue Certificate if passed
    let issuedCert = null;
    if (passed) {
      issuedCert = issueCertificate({
        records,
        materialId,
        materialTitle: material.title,
        recipientName,
        score,
        completionType: 'quiz',
        userId
      });
    }

    writeLearningRecords(records);

    // Update in-memory material status if matching
    const matIndex = materialsStore.findIndex(m => m.id === materialId);
    if (matIndex !== -1 && passed) {
      materialsStore[matIndex].progressPercent = 100;
      materialsStore[matIndex].status = 'completed';
    }

    return res.json({
      success: true,
      score,
      passed,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      certificate: issuedCert,
      message: passed ? 'Selamat! Anda lulus evaluasi kuis.' : 'Nilai evaluasi belum mencapai batas kelulusan.'
    });
  });

  // Verify Certificate (Public & Official)
  app.get('/api/certificates/verify/:certificateNumber', (req, res) => {
    const { certificateNumber } = req.params;
    const records = readLearningRecords();
    const cert = records.certificates.find((c: any) => c.certificateNumber === decodeURIComponent(certificateNumber));

    if (!cert) {
      return res.status(404).json({
        success: false,
        isValid: false,
        message: 'Nomor sertifikat tidak terdaftar dalam basis data resmi Korlantas POLRI.'
      });
    }

    return res.json({
      success: true,
      isValid: cert.isValid !== false,
      data: cert,
      message: 'Sertifikat resmi terverifikasi dan sah.'
    });
  });

  // Save Learning Progress
  app.post('/api/learning-records/progress', (req, res) => {
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const userId = caller.id;
    const { materialId, progressPercent, status, completedLessonId } = req.body;

    if (!materialId) {
      return res.status(400).json({ success: false, message: 'materialId wajib diisi.' });
    }

    const records = readLearningRecords();
    const existingIndex = records.userProgress.findIndex((p: any) => p.userId === userId && p.materialId === materialId);
    const nowIso = new Date().toISOString();
    const isFinished = (progressPercent >= 100) || status === 'completed';

    if (existingIndex === -1) {
      records.userProgress.push({
        userId,
        materialId,
        progressPercent: progressPercent || 0,
        status: status || 'in_progress',
        completedLessonIds: completedLessonId ? [completedLessonId] : [],
        lastAccessedAt: nowIso
      });
    } else {
      const prev = records.userProgress[existingIndex];
      const lessons = new Set(prev.completedLessonIds || []);
      if (completedLessonId) lessons.add(completedLessonId);

      records.userProgress[existingIndex] = {
        ...prev,
        progressPercent: typeof progressPercent === 'number' ? progressPercent : prev.progressPercent,
        status: status || prev.status,
        completedLessonIds: Array.from(lessons),
        lastAccessedAt: nowIso
      };
    }

    // Auto-issue certificate for logged-in user when material completed
    if (isFinished) {
      const material = materialsStore.find(m => m.id === materialId);
      if (material) {
        const userData = readUserData();
        const user = userData.users.find((u: any) => u.id === userId);
        const recipientName = user?.fullName || 'Personel / Trainer Dikmas Lantas POLRI';

        issueCertificate({
          records,
          materialId,
          materialTitle: material.title,
          recipientName,
          completionType: 'material',
          userId,
          institution: 'Korlantas POLRI'
        });
      }
    }

    writeLearningRecords(records);
    res.json({ success: true, message: 'Progres belajar berhasil disimpan.' });
  });

  // Toggle user bookmark
  app.post('/api/learning-records/bookmark', (req, res) => {
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const userId = caller.id;
    const { materialId } = req.body;

    if (!materialId) {
      return res.status(400).json({ success: false, message: 'materialId wajib diisi.' });
    }

    const records = readLearningRecords();
    const existingIndex = records.userBookmarks.findIndex((b: any) => b.userId === userId && b.materialId === materialId);
    let bookmarked = false;

    if (existingIndex !== -1) {
      records.userBookmarks.splice(existingIndex, 1);
      bookmarked = false;
    } else {
      records.userBookmarks.push({
        userId,
        materialId,
        createdAt: new Date().toISOString()
      });
      bookmarked = true;
    }

    writeLearningRecords(records);
    res.json({ success: true, bookmarked });
  });

  // Track User View History
  app.post('/api/learning-records/history', (req, res) => {
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const userId = caller.id;
    const { materialId } = req.body;

    if (!materialId) return res.status(400).json({ success: false });

    const records = readLearningRecords();
    records.userHistory = records.userHistory.filter((h: any) => !(h.userId === userId && h.materialId === materialId));
    records.userHistory.unshift({
      userId,
      materialId,
      accessedAt: new Date().toISOString()
    });

    writeLearningRecords(records);
    res.json({ success: true });
  });

  // Get current user profile
  app.get('/api/profile', (req, res) => {
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const data = readUserData();
    const user = caller.user;

    const { password: _, ...safeUser } = user;
    const role = data.roles.find((r: any) => r.id === user.roleId);
    res.json({ success: true, data: { user: safeUser, role } });
  });

  // Update current user profile / kedinasan
  app.put('/api/profile', (req, res) => {
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const userId = caller.id;
    const { fullName, position, unit, polda, polres } = req.body;

    const data = readUserData();
    const userIndex = data.users.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const currentUser = data.users[userIndex];
    data.users[userIndex] = {
      ...currentUser,
      fullName: fullName && typeof fullName === 'string' ? fullName.trim() : currentUser.fullName,
      position: position !== undefined ? String(position).trim() : currentUser.position,
      unit: unit !== undefined ? String(unit).trim() : currentUser.unit,
      polda: polda !== undefined ? String(polda).trim() : currentUser.polda,
      polres: polres !== undefined ? String(polres).trim() : currentUser.polres
    };

    writeUserData(data);
    const { password: _, ...safeUser } = data.users[userIndex];
    res.json({ success: true, data: { user: safeUser }, message: 'Profil dan data kedinasan berhasil diperbarui.' });
  });

  // Change password
  app.put('/api/profile/password', (req, res) => {
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const userId = caller.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password saat ini dan password baru wajib diisi.' });
    }

    const data = readUserData();
    const userIndex = data.users.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    if (data.users[userIndex].password !== currentPassword) {
      return res.status(400).json({ success: false, message: 'Password saat ini tidak sesuai.' });
    }

    data.users[userIndex].password = newPassword;
    writeUserData(data);
    res.json({ success: true, message: 'Password berhasil diubah.' });
  });

  // === OUTREACH SESSIONS & LIVE FIELD PRESENTATION API ===

  /**
   * Trainer competency gate: a trainer may only present a material they have
   * personally completed first. Completion is proven by ANY of:
   *   - a passed quiz attempt (score >= passingGrade)
   *   - an issued certificate for the material
   *   - 100% syllabus progress in learning-records
   *   - 100% syllabus progress on the material itself (materials.json)
   * Any one of these is sufficient: a trainer who finished the whole syllabus
   * has demonstrably mastered the content whether or not a quiz exists.
   */
  function getTrainerMaterialCompetency(trainerId: string, material: any) {
    const records = readLearningRecords();
    const hasQuiz = Boolean(material?.quiz && material.quiz.length > 0);

    const passedAttempt = (records.quizAttempts || [])
      .filter((q: any) => q.userId === trainerId && q.materialId === material.id && q.passed)
      .sort((a: any, b: any) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))[0] || null;

    const progress = (records.userProgress || []).find(
      (p: any) => p.userId === trainerId && p.materialId === material.id
    ) || null;

    const certificate = (records.certificates || []).find(
      (c: any) => c.userId === trainerId && c.materialId === material.id
    ) || null;

    const recordPercent = progress?.progressPercent || 0;
    const materialPercent = material?.progressPercent || 0;
    const progressPercent = Math.max(recordPercent, materialPercent);

    const syllabusDone =
      progressPercent >= 100 ||
      progress?.status === 'completed' ||
      material?.status === 'completed';

    const isEligible = Boolean(passedAttempt) || Boolean(certificate) || syllabusDone;

    return {
      isEligible,
      hasQuiz,
      progressPercent,
      syllabusDone,
      quizScore: passedAttempt?.score ?? null,
      certificateNumber: certificate?.certificateNumber || null,
      completedAt: passedAttempt?.completedAt || progress?.lastAccessedAt || null,
      reason: isEligible
        ? null
        : hasQuiz
          ? 'Trainer belum lulus kuis evaluasi maupun menuntaskan silabus materi ini.'
          : 'Trainer belum menyelesaikan seluruh silabus materi ini.'
    };
  }

  // Materials the trainer is certified/qualified to present to the public
  app.get('/api/outreach/eligible-materials', (req, res) => {
    const trainerId = (req.query.trainerId as string) || (req.headers['x-user-id'] as string) || 'user-2';

    const evaluated = materialsStore
      .filter(m => (m.publishStatus || 'published') === 'published')
      .map(m => {
        const competency = getTrainerMaterialCompetency(trainerId, m);
        return {
          id: m.id,
          title: m.title,
          level: m.level,
          type: m.type,
          typeLabel: m.typeLabel,
          hasQuiz: competency.hasQuiz,
          progressPercent: competency.progressPercent,
          quizScore: competency.quizScore,
          certificateNumber: competency.certificateNumber,
          completedAt: competency.completedAt,
          isEligible: competency.isEligible,
          reason: competency.reason
        };
      });

    const eligible = evaluated.filter(m => m.isEligible);
    const locked = evaluated.filter(m => !m.isEligible);

    res.json({
      success: true,
      count: eligible.length,
      data: eligible,
      locked,
      message: eligible.length === 0
        ? 'Anda belum lulus satu pun modul. Selesaikan pembelajaran dan kuis evaluasi terlebih dahulu untuk dapat memberikan pemaparan ke publik.'
        : undefined
    });
  });

  // List all outreach sessions (with optional trainer/status filter)
  app.get('/api/outreach/sessions', (req, res) => {
    // Session records carry the trainer's identity, unit, and the live access
    // code for the room. Anonymous audiences reach a session through
    // /api/public/session/join with a code they were given, never through this
    // list.
    if (!resolveCaller(req)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const { trainerId, status } = req.query;
    let sessions = readOutreachSessions();

    if (trainerId) {
      sessions = sessions.filter((s: any) => s.trainerId === String(trainerId));
    }
    if (status) {
      sessions = sessions.filter((s: any) => s.status === String(status));
    }

    // Attach current counts from participants & events
    const participants = readSessionParticipants();
    const events = readLearningEvents();
    const records = readLearningRecords();

    const enrichedSessions = sessions.map((s: any) => {
      const sessionParticipants = participants.filter((p: any) => p.sessionId === s.id);
      const sessionViews = events.filter((e: any) => e.sessionId === s.id && (e.eventType === 'material_view' || e.eventType === 'join_session')).length;
      const quizAttempts = (records.quizAttempts || []).filter((q: any) => q.sessionId === s.id);
      const quizCompleted = quizAttempts.filter((q: any) => q.passed || q.completed);

      return {
        ...s,
        participantCount: sessionParticipants.length,
        viewsCount: sessionViews,
        quizAttemptCount: quizAttempts.length,
        quizCompletedCount: quizCompleted.length
      };
    });

    res.json({ success: true, count: enrichedSessions.length, data: enrichedSessions });
  });

  // Create new outreach session (Trainer / Admin)
  app.post('/api/outreach/sessions', verifyAuthAndRole('trainer-outreach', 'add'), (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'user-2';
    const {
      materialId,
      activityName,
      polda,
      polres,
      location,
      date,
      startTime,
      targetParticipants,
      description
    } = req.body;

    if (!materialId || !activityName || !polda || !polres || !location || !date || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Materi, nama kegiatan, Polda, Polres, lokasi, tanggal, dan waktu pelaksanaan wajib diisi.'
      });
    }

    const material = materialsStore.find(m => m.id === materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Materi tidak ditemukan dalam katalog.' });
    }

    // Competency gate: trainer must have passed the material before presenting it
    const competency = getTrainerMaterialCompetency(userId, material);
    if (!competency.isEligible) {
      return res.status(403).json({
        success: false,
        message: `${competency.reason} Selesaikan modul "${material.title}" terlebih dahulu sebelum membuat sesi pemaparan.`,
        data: { materialId, ...competency }
      });
    }

    const userData = readUserData();
    const trainer = userData.users.find((u: any) => u.id === userId);
    const trainerName = trainer?.fullName || 'Instruktur Dikmas Lantas POLRI';

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const accessCode = `POL-${randomSuffix}`;
    const sessionId = `SES-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;
    const publicAccessUrl = `/public/session/${accessCode}`;

    const newSession = {
      id: sessionId,
      materialId,
      materialTitle: material.title,
      trainerId: userId,
      trainerName,
      // Snapshot trainer kedinasan for historical consistency
      trainerPosition: trainer?.position || '',
      trainerUnit: trainer?.unit || '',
      // Snapshot proof that the trainer is qualified on this material
      trainerCompetency: {
        quizScore: competency.quizScore,
        progressPercent: competency.progressPercent,
        certificateNumber: competency.certificateNumber,
        verifiedAt: new Date().toISOString()
      },
      activityName,
      polda,
      polres,
      location,
      date,
      startTime,
      status: 'active',
      publicAccessCode: accessCode,
      publicAccessUrl,
      targetParticipants: targetParticipants ? Number(targetParticipants) : 0,
      description: description || '',
      createdAt: new Date().toISOString()
    };

    const sessions = readOutreachSessions();
    sessions.unshift(newSession);
    writeOutreachSessions(sessions);

    res.json({
      success: true,
      data: newSession,
      message: 'Sesi kegiatan pemaparan berhasil dibuat dan aktif.'
    });
  });

  // Get single session detail & live real metrics
  app.get('/api/outreach/sessions/:id', (req, res) => {
    const { id } = req.params;
    const sessions = readOutreachSessions();
    const session = sessions.find((s: any) => s.id === id || s.publicAccessCode === id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi kegiatan pemaparan tidak ditemukan.' });
    }

    const rawParticipants = readSessionParticipants().filter((p: any) => p.sessionId === session.id);
    const events = readLearningEvents().filter((e: any) => e.sessionId === session.id);
    const records = readLearningRecords();
    const sessionQuizAttempts = (records.quizAttempts || []).filter((q: any) => q.sessionId === session.id);
    const sessionCertificates = (records.certificates || []).filter((c: any) => c.sessionId === session.id);

    const participants = rawParticipants.map((p: any) => {
      const attempt = sessionQuizAttempts.find((q: any) => q.participantId === p.id);
      const cert = sessionCertificates.find((c: any) => c.participantId === p.id);
      return {
        ...p,
        quizScore: attempt ? attempt.score : null,
        quizPassed: attempt ? attempt.passed : false,
        certificate: cert || null
      };
    });

    const views = events.filter((e: any) => e.eventType === 'material_view' || e.eventType === 'join_session').length;
    const lessonViews = events.filter((e: any) => e.eventType === 'lesson_view').length;
    const quizStarts = events.filter((e: any) => e.eventType === 'quiz_start').length;
    const quizCompleted = sessionQuizAttempts.filter((q: any) => q.passed || q.completed).length;
    const certifiedCount = sessionCertificates.length;

    const averageQuizScore = sessionQuizAttempts.length > 0
      ? Math.round(sessionQuizAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / sessionQuizAttempts.length)
      : 0;

    const material = materialsStore.find(m => m.id === session.materialId);

    res.json({
      success: true,
      data: {
        ...session,
        material,
        participants,
        metrics: {
          participantCount: participants.length,
          viewsCount: views,
          lessonViewsCount: lessonViews,
          quizStartCount: quizStarts,
          quizAttemptCount: sessionQuizAttempts.length,
          quizCompletedCount: quizCompleted,
          certifiedCount,
          averageQuizScore
        },
        recentEvents: events.slice(-20).reverse()
      }
    });
  });

  // Verify and join public session by code (Public Masyarakat)
  app.post('/api/public/session/join', (req, res) => {
    const { code, name, place } = req.body;

    if (!code || !name || !place) {
      return res.status(400).json({
        success: false,
        message: 'Kode sesi, nama lengkap peserta, dan asal instansi/sekolah wajib diisi.'
      });
    }

    const sessions = readOutreachSessions();
    const session = sessions.find((s: any) => s.publicAccessCode.toUpperCase() === String(code).trim().toUpperCase());

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Kode kegiatan pemaparan tidak ditemukan atau tidak valid.'
      });
    }

    if (session.status === 'closed' || session.status === 'completed') {
      return res.status(410).json({
        success: false,
        sessionClosed: true,
        message: 'Kegiatan pemaparan ini telah selesai dan ditutup oleh instruktur.'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Sesi pemaparan saat ini berstatus ${session.status}.`
      });
    }

    const material = materialsStore.find(m => m.id === session.materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Materi edukasi tidak ditemukan.' });
    }

    // Create participant record
    const participantId = `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const joinedAt = new Date().toISOString();
    const newParticipant = {
      id: participantId,
      sessionId: session.id,
      name: String(name).trim(),
      place: String(place).trim(),
      joinedAt
    };

    const participants = readSessionParticipants();
    participants.push(newParticipant);
    writeSessionParticipants(participants);

    // Track join event
    const events = readLearningEvents();
    events.push({
      id: `evt-${Date.now()}`,
      sessionId: session.id,
      participantId,
      materialId: session.materialId,
      eventType: 'join_session',
      details: { name: newParticipant.name, place: newParticipant.place },
      timestamp: joinedAt
    });
    writeLearningEvents(events);

    res.json({
      success: true,
      data: {
        session,
        participant: newParticipant,
        material
      },
      message: 'Berhasil bergabung dalam kegiatan pemaparan.'
    });
  });

  // Track Learning Event (Session & Public)
  app.post('/api/learning-events/track', (req, res) => {
    const { sessionId, participantId, userId, materialId, eventType, details } = req.body;

    if (!materialId || !eventType) {
      return res.status(400).json({ success: false, message: 'materialId dan eventType wajib diisi.' });
    }

    const validEventTypes = [
      'join_session',
      'material_view',
      'lesson_view',
      'video_start',
      'video_progress',
      'document_view',
      'infographic_view',
      'quiz_start',
      'quiz_answer',
      'quiz_submit',
      'quiz_completed',
      'material_completed'
    ];

    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({ success: false, message: 'Jenis event pembelajaran tidak valid.' });
    }

    const timestamp = new Date().toISOString();
    const events = readLearningEvents();
    const eventRecord = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      sessionId: sessionId || null,
      participantId: participantId || null,
      userId: userId || null,
      materialId,
      eventType,
      details: details || {},
      timestamp
    };
    events.push(eventRecord);
    writeLearningEvents(events);

    // Increment material view count if material_view
    if (eventType === 'material_view') {
      const matIndex = materialsStore.findIndex(m => m.id === materialId);
      if (matIndex !== -1) {
        materialsStore[matIndex].views = (materialsStore[matIndex].views || 0) + 1;
        writeMaterialsData(materialsStore);
      }
    }

    res.json({ success: true, data: eventRecord });
  });

  // Submit Session Quiz Attempt (Public Participant in Trainer Session)
  app.post('/api/outreach/session/quiz/submit', (req, res) => {
    const { sessionId, participantId, materialId, answers, passingGrade = 70 } = req.body;

    if (!sessionId || !participantId || !materialId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId, participantId, dan materialId wajib diisi untuk evaluasi kuis sesi.'
      });
    }

    const sessions = readOutreachSessions();
    const session = sessions.find((s: any) => s.id === sessionId);
    if (!session || session.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Sesi kegiatan pemaparan sudah ditutup atau tidak aktif.'
      });
    }

    const material = materialsStore.find(m => m.id === materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Materi tidak ditemukan.' });
    }

    const participants = readSessionParticipants();
    const participant = participants.find((p: any) => p.id === participantId && p.sessionId === sessionId);
    const participantName = participant?.name || 'Peserta Kegiatan';

    const questions = (material.quiz && material.quiz.length > 0) ? material.quiz : [
      { id: 1, correctIndex: 1 },
      { id: 2, correctIndex: 1 }
    ];

    let correctCount = 0;
    if (answers && typeof answers === 'object') {
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correctIndex) {
          correctCount += 1;
        }
      });
    }
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= passingGrade;
    const nowIso = new Date().toISOString();

    const newAttempt = {
      attemptId: `att-sess-${Date.now()}`,
      id: `att-sess-${Date.now()}`,
      sessionId,
      participantId,
      participantName,
      materialId,
      score,
      passed,
      passingGrade,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      answers: answers || {},
      completed: true,
      startedAt: req.body.startedAt || nowIso,
      submittedAt: nowIso,
      completedAt: nowIso
    };

    const records = readLearningRecords();
    records.quizAttempts.push(newAttempt);

    // Issue certificate on pass (idempotent per participant + material)
    let certificate = null;
    if (passed) {
      certificate = issueCertificate({
        records,
        materialId,
        materialTitle: material.title,
        recipientName: participantName,
        score,
        completionType: 'quiz',
        participantId,
        sessionId,
        session,
        institution: participant?.place || 'Peserta Dikmas Lantas POLRI'
      });
    }

    writeLearningRecords(records);

    // Track Quiz Completed Event
    const events = readLearningEvents();
    events.push({
      id: `evt-${Date.now()}`,
      sessionId,
      participantId,
      materialId,
      eventType: 'quiz_completed',
      details: { score, passed, correctCount, totalQuestions: questions.length },
      timestamp: nowIso
    });
    writeLearningEvents(events);

    res.json({
      success: true,
      score,
      passed,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      certificate,
      message: passed ? 'Selamat! Anda lulus evaluasi materi pemaparan.' : 'Evaluasi selesai. Tingkatkan pemahaman materi.'
    });
  });

  /**
   * Issue a certificate for a public session participant who finished every
   * lesson of the material without taking a quiz (materials with no quiz, or
   * completion-by-reading). Idempotent: repeat calls return the same record.
   */
  app.post('/api/outreach/session/complete', (req, res) => {
    const { sessionId, participantId, materialId } = req.body;

    if (!sessionId || !participantId || !materialId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId, participantId, dan materialId wajib diisi.'
      });
    }

    const sessions = readOutreachSessions();
    const session = sessions.find((s: any) => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi kegiatan pemaparan tidak ditemukan.' });
    }

    const material = materialsStore.find(m => m.id === materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Materi tidak ditemukan.' });
    }

    const participants = readSessionParticipants();
    const participant = participants.find((p: any) => p.id === participantId && p.sessionId === sessionId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Peserta tidak terdaftar pada sesi ini.' });
    }

    const records = readLearningRecords();
    const certificate = issueCertificate({
      records,
      materialId,
      materialTitle: material.title,
      recipientName: participant.name,
      completionType: 'material',
      participantId,
      sessionId,
      session,
      institution: participant.place || 'Peserta Dikmas Lantas POLRI'
    });
    writeLearningRecords(records);

    const nowIso = new Date().toISOString();
    const events = readLearningEvents();
    events.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      sessionId,
      participantId,
      materialId,
      eventType: 'material_completed',
      details: { certificateNumber: certificate.certificateNumber },
      timestamp: nowIso
    });
    writeLearningEvents(events);

    return res.json({
      success: true,
      certificate,
      message: 'Materi diselesaikan. Sertifikat kelulusan telah diterbitkan.'
    });
  });

  /**
   * Look up the certificates already earned by a session participant, so the
   * download button survives a page refresh.
   */
  app.get('/api/outreach/session/certificates', (req, res) => {
    const { sessionId, participantId } = req.query as Record<string, string>;
    if (!participantId) {
      return res.status(400).json({ success: false, message: 'participantId wajib diisi.' });
    }

    const records = readLearningRecords();
    const list = records.certificates.filter((c: any) =>
      c.participantId === participantId && (!sessionId || c.sessionId === sessionId)
    );

    return res.json({ success: true, count: list.length, data: list });
  });

  /**
   * Printable certificate document. Served as HTML so the browser's native
   * "Save as PDF" produces the final file — no PDF library dependency.
   * `?download=1` forces a file download of the same document.
   */
  app.get('/api/certificates/:certificateNumber/download', (req, res) => {
    const certificateNumber = decodeURIComponent(req.params.certificateNumber);
    const records = readLearningRecords();
    const cert = records.certificates.find((c: any) => c.certificateNumber === certificateNumber);

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Sertifikat tidak ditemukan dalam basis data resmi Korlantas POLRI.'
      });
    }

    if (cert.isValid === false) {
      return res.status(410).json({
        success: false,
        message: 'Sertifikat ini telah dicabut dan tidak lagi berlaku.'
      });
    }

    const html = renderCertificateHtml(cert);
    const safeName = `Sertifikat-${cert.certificateNumber.replace(/[^A-Za-z0-9]+/g, '-')}.html`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.query.download) {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    }
    return res.send(html);
  });

  /**
   * Batch print / preview all earned certificates for a given outreach session.
   * Generates a multi-page A4 landscape print-ready document containing all certificates.
   */
  app.get('/api/outreach/sessions/:sessionId/certificates/batch-print', (req, res) => {
    const { sessionId } = req.params;
    const records = readLearningRecords();
    const certs = records.certificates.filter((c: any) => c.sessionId === sessionId && c.isValid !== false);

    if (!certs || certs.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html><head><title>Belum Ada Sertifikat</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Belum ada sertifikat terbit untuk sesi ini</h2>
          <p>Sertifikat hanya diterbitkan untuk peserta yang telah lulus kuis evaluasi atau menuntaskan 100% materi.</p>
        </body></html>
      `);
    }

    const polriLogo = getPolriLogoBase64();
    const korlantasLogo = getKorlantasLogoBase64();
    const pagesHtml = certs.map((cert: any) => renderCertificateInnerHtml(cert, polriLogo, korlantasLogo)).join('\n');
    const e = escapeHtml;

    const fullHtml = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Batch Cetak Sertifikat - Sesi ${e(sessionId)} (${certs.length} Peserta)</title>
<style>
${CERTIFICATE_SHARED_CSS}
  body {
    padding-top: 65px;
  }
  @media print {
    body { padding-top: 0 !important; }
  }
</style>
</head>
<body>
  <div class="bar">
    <span>Siap mencetak <strong>${certs.length} Sertifikat Kelulusan</strong> untuk seluruh peserta yang telah lulus / menuntaskan materi.</span>
    <button onclick="window.print()">&starf; Cetak Semua (${certs.length} Dokumen)</button>
  </div>

  <div class="batch-container">
    ${pagesHtml}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(fullHtml);
  });

  // Submit Activity Report & Close Session (Trainer)
  app.post('/api/outreach/sessions/:id/report', verifyAuthAndRole('trainer-outreach', 'edit'), (req, res) => {
    const { id } = req.params;
    const userId = (req.headers['x-user-id'] as string) || 'user-2';
    const { notes, evidenceImages = [], customParticipantCount } = req.body;

    const sessions = readOutreachSessions();
    const sessionIndex = sessions.findIndex((s: any) => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({ success: false, message: 'Sesi kegiatan pemaparan tidak ditemukan.' });
    }

    const currentSession = sessions[sessionIndex];
    const participants = readSessionParticipants().filter((p: any) => p.sessionId === id);
    const events = readLearningEvents().filter((e: any) => e.sessionId === id);
    const records = readLearningRecords();
    const sessionQuizAttempts = (records.quizAttempts || []).filter((q: any) => q.sessionId === id);

    const totalParticipants = typeof customParticipantCount === 'number' && customParticipantCount > 0
      ? customParticipantCount
      : participants.length;

    const totalViews = events.filter((e: any) => e.eventType === 'material_view' || e.eventType === 'join_session').length;
    const totalQuizAttempts = sessionQuizAttempts.length;
    const totalQuizCompleted = sessionQuizAttempts.filter((q: any) => q.passed || q.completed).length;
    const averageScore = totalQuizAttempts > 0
      ? Math.round(sessionQuizAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / totalQuizAttempts)
      : 0;
    const passingRate = totalQuizAttempts > 0
      ? Math.round((sessionQuizAttempts.filter((q: any) => q.passed).length / totalQuizAttempts) * 100)
      : 0;

    const nowIso = new Date().toISOString();

    // Create Official Outreach Report
    const newReport = {
      id: `rep-${Date.now()}`,
      sessionId: id,
      trainerId: currentSession.trainerId || userId,
      trainerName: currentSession.trainerName || 'Instruktur',
      activityName: currentSession.activityName,
      materialId: currentSession.materialId,
      materialTitle: currentSession.materialTitle || 'Materi Edukasi Dikmas',
      polda: currentSession.polda,
      polres: currentSession.polres,
      location: currentSession.location,
      date: currentSession.date,
      startTime: currentSession.startTime,
      closedAt: nowIso,
      totalParticipants,
      totalViews,
      totalQuizAttempts,
      totalQuizCompleted,
      averageScore,
      passingRate,
      notes: notes || '',
      evidenceImages: Array.isArray(evidenceImages) ? evidenceImages : [],
      createdAt: nowIso
    };

    const reports = readOutreachReports();
    reports.unshift(newReport);
    writeOutreachReports(reports);

    // Mark Session as Closed
    sessions[sessionIndex] = {
      ...currentSession,
      status: 'closed',
      closedAt: nowIso
    };
    writeOutreachSessions(sessions);

    res.json({
      success: true,
      data: newReport,
      message: 'Laporan kegiatan pemaparan berhasil dibuat dan sesi telah ditutup secara resmi.'
    });
  });

  // Upload Evidence Image (Base64 or URL storage)
  app.post('/api/outreach/evidence/upload', (req, res) => {
    const { imageBase64, filename } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'File gambar bukti kegiatan wajib disertakan.' });
    }

    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'evidence');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const safeName = `evidence-${Date.now()}-${(filename || 'foto.jpg').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsDir, safeName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/evidence/${safeName}`;

      return res.json({
        success: true,
        url: publicUrl,
        filename: safeName,
        message: 'Foto bukti kegiatan berhasil diunggah.'
      });
    } catch (err: any) {
      console.error('Evidence upload failed:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan berkas foto bukti kegiatan ke server.'
      });
    }
  });

  // Get All Outreach Reports (Executive / Trainer / Admin)
  app.get('/api/outreach/reports', (req, res) => {
    // Field activity reports are internal reporting material, not public data.
    if (!resolveCaller(req)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const { polda, polres, trainerId, materialId } = req.query;
    let reports = readOutreachReports();

    if (polda) {
      reports = reports.filter((r: any) => r.polda === String(polda));
    }
    if (polres) {
      reports = reports.filter((r: any) => r.polres === String(polres));
    }
    if (trainerId) {
      reports = reports.filter((r: any) => r.trainerId === String(trainerId));
    }
    if (materialId) {
      reports = reports.filter((r: any) => r.materialId === String(materialId));
    }

    res.json({ success: true, count: reports.length, data: reports });
  });

  // Full result preview of one field activity — the same payload backs both the
  // trainer's own recap and the executive's drill-down, so the two can never
  // disagree about what happened in a session.
  app.get('/api/outreach/activity-detail/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const caller = resolveCaller(req);
    if (!caller) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    // The account's stored role decides what may be seen. Reading x-role-id here
    // would let a trainer send role-admin and open anyone's activity.
    const roleId = caller.user.roleId;
    const userId = caller.id;

    const session = readOutreachSessions().find((s: any) => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
    }

    // A trainer may only open their own activity; pimpinan and admin see all.
    const isSupervisor = roleId === 'role-admin' || roleId === 'role-executive';
    if (!isSupervisor && session.trainerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda hanya dapat melihat hasil kegiatan yang Anda selenggarakan.'
      });
    }

    const report = readOutreachReports().find((r: any) => r.sessionId === session.id) || null;
    const records = readLearningRecords();
    const attempts = (records.quizAttempts || []).filter((q: any) => q.sessionId === session.id);
    const certificates = (records.certificates || []).filter((c: any) => c.sessionId === session.id);
    const events = readLearningEvents().filter((e: any) => e.sessionId === session.id);
    const material = materialsStore.find(m => m.id === session.materialId) || null;

    // Per-participant roster: what each person actually did, not just a headcount.
    const participants = readSessionParticipants()
      .filter((p: any) => p.sessionId === session.id)
      .map((p: any) => {
        const attempt = attempts.find((q: any) => q.participantId === p.id) || null;
        const cert = certificates.find((c: any) => c.participantId === p.id) || null;
        const own = events.filter((e: any) => e.participantId === p.id);
        return {
          id: p.id,
          name: p.name,
          place: p.place,
          joinedAt: p.joinedAt,
          lessonViews: own.filter((e: any) => e.eventType === 'lesson_view').length,
          materialViews: own.filter((e: any) => e.eventType === 'material_view').length,
          quizStarted: own.some((e: any) => e.eventType === 'quiz_start'),
          quizScore: attempt ? attempt.score : null,
          quizPassed: attempt ? Boolean(attempt.passed) : false,
          correctAnswers: attempt ? attempt.correctAnswers ?? null : null,
          totalQuestions: attempt ? attempt.totalQuestions ?? null : null,
          submittedAt: attempt ? attempt.submittedAt || attempt.completedAt || null : null,
          certificateNumber: cert ? cert.certificateNumber : null,
          certificateId: cert ? cert.certificateId : null,
        };
      });

    const scored = attempts.filter((a: any) => typeof a.score === 'number');
    const passedCount = attempts.filter((a: any) => a.passed).length;
    const averageScore = scored.length > 0
      ? Math.round(scored.reduce((s: number, a: any) => s + a.score, 0) / scored.length)
      : 0;

    // Which questions tripped people up — the one thing a trainer can act on
    // for the next session, and the reason this preview beats a raw headcount.
    const quizQuestions: any[] = Array.isArray(material?.quiz) ? material!.quiz as any[] : [];
    const questionBreakdown = quizQuestions.map((q: any, idx: number) => {
      const answered = attempts.filter((a: any) => a.answers && a.answers[idx] !== undefined);
      const correct = answered.filter((a: any) => Number(a.answers[idx]) === q.correctIndex).length;
      return {
        index: idx,
        question: q.question,
        answeredCount: answered.length,
        correctCount: correct,
        correctPercent: answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0,
      };
    });

    const scoreDistribution = [
      { band: '0-49', count: scored.filter((a: any) => a.score < 50).length },
      { band: '50-69', count: scored.filter((a: any) => a.score >= 50 && a.score < 70).length },
      { band: '70-84', count: scored.filter((a: any) => a.score >= 70 && a.score < 85).length },
      { band: '85-100', count: scored.filter((a: any) => a.score >= 85).length },
    ];

    const metrics = {
      participantCount: participants.length,
      materialViews: events.filter((e: any) => e.eventType === 'material_view').length,
      lessonViews: events.filter((e: any) => e.eventType === 'lesson_view').length,
      quizStarted: events.filter((e: any) => e.eventType === 'quiz_start').length,
      quizAttemptCount: attempts.length,
      quizPassedCount: passedCount,
      certificateCount: certificates.length,
      averageScore,
      passingRate: attempts.length > 0 ? Math.round((passedCount / attempts.length) * 100) : 0,
      // Of everyone who joined, how many actually finished the quiz.
      engagementRate: participants.length > 0
        ? Math.round((attempts.length / participants.length) * 100)
        : 0,
    };

    res.json({
      success: true,
      data: {
        session,
        report,
        material: material
          ? { id: material.id, title: material.title, level: material.level, imageUrl: material.imageUrl }
          : null,
        participants,
        metrics,
        scoreDistribution,
        questionBreakdown,
        certificates,
        evidenceImages: report?.evidenceImages || [],
        notes: report?.notes || '',
        timeline: events
          .slice()
          .sort((a: any, b: any) => String(b.timestamp).localeCompare(String(a.timestamp)))
          .slice(0, 30),
      }
    });
  });

  // === EXECUTIVE ANALYTICS (REAL COMPUTED DATA ONLY) ===
  app.get('/api/executive/analytics', verifyAuthAndRole('executive', 'view'), (req, res) => {
    const caller = resolveCaller(req);
    const callerUser = caller?.user || {};
    const callerRole = callerUser.roleId;
    const callerExecLevel = callerUser.executiveLevel as 'nasional' | 'polda' | 'polres' | undefined;

    // Master 34 Polda kewilayahan resmi
    const poldaMaster = getPoldaList().filter(p => p.isWilayah);
    const POLDA_REFERENCE = poldaMaster.map(p => p.nama);

    // Tentukan lingkup wilayah efektif (enforce scope eksekutif)
    let effectivePolda: string | undefined = req.query.polda ? String(req.query.polda) : undefined;
    let effectivePolres: string | undefined = req.query.polres ? String(req.query.polres) : undefined;

    // Eksekutif level Polda / Polres terkunci ke wilayahnya sendiri
    if (callerRole === 'role-executive') {
      if (callerExecLevel === 'polda' && callerUser.polda) {
        effectivePolda = callerUser.polda;
      } else if (callerExecLevel === 'polres' && callerUser.polda) {
        effectivePolda = callerUser.polda;
        if (callerUser.polres) effectivePolres = callerUser.polres;
      }
    }

    const { trainerId, level, startDate, endDate } = req.query;

    let materials = [...materialsStore];
    let sessions = readOutreachSessions();
    let reports = readOutreachReports();
    let participants = readSessionParticipants();
    let events = readLearningEvents();
    let records = readLearningRecords();
    let userData = readUserData();

    // Level filter: narrow the material set first, then keep only the sessions that
    // presented one of those materials.
    if (level && String(level) !== 'ALL') {
      materials = materials.filter(m => String(m.level).toUpperCase() === String(level).toUpperCase());
      const levelMaterialIds = new Set(materials.map(m => m.id));
      sessions = sessions.filter((s: any) => levelMaterialIds.has(s.materialId));
      reports = reports.filter((r: any) => levelMaterialIds.has(r.materialId));
    }

    // Filter by Polda & Polres (case-insensitive + id matching)
    if (effectivePolda && String(effectivePolda) !== 'ALL') {
      const targetPolda = String(effectivePolda).toLowerCase();
      sessions = sessions.filter((s: any) =>
        (s.polda && s.polda.toLowerCase() === targetPolda) ||
        (s.poldaId && callerUser.poldaId && s.poldaId === callerUser.poldaId)
      );
      reports = reports.filter((r: any) =>
        (r.polda && r.polda.toLowerCase() === targetPolda) ||
        (r.poldaId && callerUser.poldaId && r.poldaId === callerUser.poldaId)
      );
    }
    if (effectivePolres && String(effectivePolres) !== 'ALL') {
      const targetPolres = String(effectivePolres).toLowerCase();
      sessions = sessions.filter((s: any) =>
        (s.polres && s.polres.toLowerCase() === targetPolres) ||
        (s.polresId && callerUser.polresId && s.polresId === callerUser.polresId)
      );
      reports = reports.filter((r: any) =>
        (r.polres && r.polres.toLowerCase() === targetPolres) ||
        (r.polresId && callerUser.polresId && r.polresId === callerUser.polresId)
      );
    }
    if (trainerId && String(trainerId) !== 'ALL') {
      sessions = sessions.filter((s: any) => s.trainerId === String(trainerId));
      reports = reports.filter((r: any) => r.trainerId === String(trainerId));
    }

    // Date range on the activity date
    const sessionDate = (s: any) => String(s.date || s.createdAt || '').slice(0, 10);
    if (startDate) {
      sessions = sessions.filter((s: any) => sessionDate(s) >= String(startDate));
      reports = reports.filter((r: any) => sessionDate(r) >= String(startDate));
    }
    if (endDate) {
      sessions = sessions.filter((s: any) => sessionDate(s) <= String(endDate));
      reports = reports.filter((r: any) => sessionDate(r) <= String(endDate));
    }

    const sessionIds = new Set(sessions.map((s: any) => s.id));
    participants = participants.filter((p: any) => sessionIds.has(p.sessionId));
    const sessionEvents = events.filter((e: any) => sessionIds.has(e.sessionId));
    const publicEvents = events.filter((e: any) => !e.sessionId);

    // Real Computations
    const totalMaterials = materials.length;
    const totalPublicMaterials = materials.filter(m => (m.publishStatus || 'published') === 'published' && m.publicAccess !== 'restricted').length;

    const trainerUsers = userData.users.filter((u: any) => u.roleId === 'role-trainer');
    const totalTrainers = trainerUsers.length;

    const totalSessions = sessions.length;
    const totalCompletedSessions = sessions.filter((s: any) => s.status === 'closed' || s.status === 'completed').length;

    // Total participants across active sessions + reports
    const distinctParticipantCount = participants.length;
    const reportedParticipants = reports.reduce((sum: number, r: any) => sum + (r.totalParticipants || 0), 0);
    const totalParticipants = Math.max(distinctParticipantCount, reportedParticipants);

    // Count events only. materialsStore.views is incremented by the same
    // /learning-events/track call that writes these events, so adding both
    // double-counts every visit.
    const totalPublicViews = publicEvents.filter((e: any) => e.eventType === 'material_view').length;

    const totalSessionViews = sessionEvents.filter((e: any) => e.eventType === 'material_view' || e.eventType === 'join_session').length;

    const sessionQuizAttempts = (records.quizAttempts || []).filter((q: any) => sessionIds.has(q.sessionId));
    const totalQuizAttempts = sessionQuizAttempts.length + reports.reduce((sum: number, r: any) => sum + (r.totalQuizAttempts || 0), 0);
    const totalQuizCompleted = sessionQuizAttempts.filter((q: any) => q.passed || q.completed).length +
      reports.reduce((sum: number, r: any) => sum + (r.totalQuizCompleted || 0), 0);

    const scoresPool = [
      ...sessionQuizAttempts.map((q: any) => q.score),
      ...reports.filter((r: any) => r.averageScore > 0).map((r: any) => r.averageScore)
    ];

    const averageQuizScore = scoresPool.length > 0
      ? Math.round(scoresPool.reduce((sum, s) => sum + s, 0) / scoresPool.length)
      : 0;

    const completionRate = totalQuizAttempts > 0
      ? Math.round((totalQuizCompleted / totalQuizAttempts) * 100)
      : (totalSessions > 0 ? Math.round((totalCompletedSessions / totalSessions) * 100) : 0);

    // Material Popularity by Real Metrics
    const popularMaterials = materials.map(m => {
      const matSessions = sessions.filter((s: any) => s.materialId === m.id);
      const matSessionIds = new Set(matSessions.map((s: any) => s.id));
      const matParticipants = participants.filter((p: any) => matSessionIds.has(p.sessionId)).length;
      const matSessionViews = events.filter((e: any) => matSessionIds.has(e.sessionId) && e.eventType === 'material_view').length;
      const matPublicViews = events.filter((e: any) => !e.sessionId && e.materialId === m.id && e.eventType === 'material_view').length;
      const matQuizAttempts = (records.quizAttempts || []).filter((q: any) => q.materialId === m.id).length;

      return {
        materialId: m.id,
        title: m.title,
        level: m.level,
        publicViews: matPublicViews,
        sessionViews: matSessionViews,
        sessionCount: matSessions.length,
        participantCount: matParticipants,
        quizAttemptCount: matQuizAttempts
      };
    }).sort((a, b) => (b.sessionViews + b.publicViews) - (a.sessionViews + a.publicViews));

    // Trainer Performance from Real Data
    const trainerPerformance = trainerUsers.map((t: any) => {
      const tSessions = sessions.filter((s: any) => s.trainerId === t.id);
      const tSessionIds = new Set(tSessions.map((s: any) => s.id));
      const tMaterials = new Set(tSessions.map((s: any) => s.materialId));
      const tParticipants = participants.filter((p: any) => tSessionIds.has(p.sessionId)).length;
      const tSessionViews = events.filter((e: any) => tSessionIds.has(e.sessionId)).length;
      const tQuizCount = (records.quizAttempts || []).filter((q: any) => tSessionIds.has(q.sessionId)).length;
      const tCompletion = tSessions.filter((s: any) => s.status === 'closed' || s.status === 'completed').length;

      return {
        trainerId: t.id,
        trainerName: t.fullName,
        sessionCount: tSessions.length,
        materialCount: tMaterials.size,
        participantCount: tParticipants,
        sessionViews: tSessionViews,
        quizCount: tQuizCount,
        completionCount: tCompletion
      };
    }).sort((a, b) => b.sessionCount - a.sessionCount);

    // Regional Hierarchy Grouping
    const poldaMap: Record<string, { polresMap: Record<string, { sessions: number; participants: number; views: number; trainers: Set<string> }>; totalSessions: number; totalParticipants: number; totalViews: number }> = {};

    sessions.forEach((s: any) => {
      if (!poldaMap[s.polda]) {
        poldaMap[s.polda] = { polresMap: {}, totalSessions: 0, totalParticipants: 0, totalViews: 0 };
      }
      if (!poldaMap[s.polda].polresMap[s.polres]) {
        poldaMap[s.polda].polresMap[s.polres] = { sessions: 0, participants: 0, views: 0, trainers: new Set() };
      }

      // Roll the real per-session numbers up into both levels. Previously only the
      // session counters were incremented, so every "peserta"/"views" figure in the
      // regional panel rendered as 0 no matter how much field activity existed.
      const sParticipants = participants.filter((p: any) => p.sessionId === s.id).length;
      const sViews = events.filter((e: any) => e.sessionId === s.id && e.eventType === 'material_view').length;

      poldaMap[s.polda].totalSessions += 1;
      poldaMap[s.polda].totalParticipants += sParticipants;
      poldaMap[s.polda].totalViews += sViews;

      poldaMap[s.polda].polresMap[s.polres].sessions += 1;
      poldaMap[s.polda].polresMap[s.polres].participants += sParticipants;
      poldaMap[s.polda].polresMap[s.polres].views += sViews;
      if (s.trainerName) poldaMap[s.polda].polresMap[s.polres].trainers.add(s.trainerName);
    });

    const regionalHierarchy = Object.entries(poldaMap).map(([poldaName, poldaData]) => {
      const polresList = Object.entries(poldaData.polresMap).map(([polresName, polresData]) => ({
        polres: polresName,
        sessionCount: polresData.sessions,
        participantCount: polresData.participants,
        views: polresData.views,
        trainers: Array.from(polresData.trainers)
      }));

      return {
        polda: poldaName,
        polresList: polresList.sort((a, b) => b.sessionCount - a.sessionCount),
        totalSessions: poldaData.totalSessions,
        totalParticipants: poldaData.totalParticipants,
        totalViews: poldaData.totalViews
      };
    }).sort((a, b) => b.totalSessions - a.totalSessions);

    // --- Monthly activity trend (last 6 months, oldest first) ---
    const monthKeys: string[] = [];
    const trendAnchor = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(trendAnchor.getFullYear(), trendAnchor.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    const activityTrend = monthKeys.map(key => {
      const monthSessions = sessions.filter((s: any) => sessionDate(s).slice(0, 7) === key);
      const monthSessionIds = new Set(monthSessions.map((s: any) => s.id));
      const monthParticipants = participants.filter((p: any) => monthSessionIds.has(p.sessionId)).length;
      const monthAttempts = (records.quizAttempts || []).filter((q: any) => monthSessionIds.has(q.sessionId));

      return {
        month: key,
        label: `${MONTH_LABELS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`,
        sessionCount: monthSessions.length,
        participantCount: monthParticipants,
        quizAttemptCount: monthAttempts.length,
        quizPassedCount: monthAttempts.filter((q: any) => q.passed).length
      };
    });

    // --- Reach per education level (which jenjang is actually being served) ---
    const LEVEL_ORDER = ['TK/PAUD', 'SD', 'SMP', 'SMA'];
    const levelBreakdown = LEVEL_ORDER.map(lvl => {
      const lvlMaterialIds = new Set(
        materialsStore.filter(m => String(m.level).toUpperCase() === lvl).map(m => m.id)
      );
      const lvlSessions = sessions.filter((s: any) => lvlMaterialIds.has(s.materialId));
      const lvlSessionIds = new Set(lvlSessions.map((s: any) => s.id));

      return {
        level: lvl,
        materialCount: lvlMaterialIds.size,
        sessionCount: lvlSessions.length,
        participantCount: participants.filter((p: any) => lvlSessionIds.has(p.sessionId)).length
      };
    }).filter(l => l.materialCount > 0);

    // --- Quiz score distribution (evidence of comprehension, not just attendance) ---
    const SCORE_BANDS = [
      { band: '0-49', min: 0, max: 49 },
      { band: '50-69', min: 50, max: 69 },
      { band: '70-84', min: 70, max: 84 },
      { band: '85-100', min: 85, max: 100 }
    ];
    const scoreDistribution = SCORE_BANDS.map(b => ({
      band: b.band,
      count: sessionQuizAttempts.filter((q: any) => q.score >= b.min && q.score <= b.max).length
    }));

    // --- Session status breakdown ---
    const statusBreakdown = ['scheduled', 'active', 'completed', 'closed', 'cancelled'].map(st => ({
      status: st,
      count: sessions.filter((s: any) => s.status === st).length
    })).filter(s => s.count > 0);

    // --- Latest field activity feed (10 newest closed reports) ---
    const recentActivity = [...reports]
      .sort((a: any, b: any) => String(b.closedAt || b.createdAt || '').localeCompare(String(a.closedAt || a.createdAt || '')))
      .slice(0, 10)
      .map((r: any) => ({
        reportId: r.id,
        sessionId: r.sessionId,
        activityName: r.activityName,
        materialTitle: r.materialTitle,
        trainerName: r.trainerName,
        polda: r.polda,
        polres: r.polres,
        location: r.location,
        date: r.date,
        closedAt: r.closedAt || r.createdAt,
        totalParticipants: r.totalParticipants || 0,
        averageScore: r.averageScore || 0,
        passingRate: r.passingRate || 0
      }));

    // Trainers who are registered but have never run a session — the actionable
    // leadership signal that raw totals hide.
    const idleTrainers = trainerPerformance.filter((t: any) => t.sessionCount === 0).length;
    const activeTrainers = totalTrainers - idleTrainers;

    // === KPI SCORING ===
    // Raw totals let a big Polda look good purely by being big. A composite score
    // mixes volume with quality so leadership sees who performs, not just who is
    // large. Four weighted components, each normalised 0-100:
    //   Aktivitas 30% — how much field work was actually run (vs the best performer)
    //   Jangkauan 25% — how many people were reached (vs the best performer)
    //   Kualitas   25% — average quiz score of the audience (absolute, not relative)
    //   Ketuntasan 20% — share of activities properly closed and reported
    const KPI_WEIGHTS = { activity: 30, reach: 25, quality: 25, discipline: 20 };

    const relScore = (value: number, best: number) =>
      best > 0 ? Math.round((value / best) * 100) : 0;

    const kpiGrade = (score: number) => {
      if (score >= 85) return { grade: 'A', label: 'Sangat Baik' };
      if (score >= 70) return { grade: 'B', label: 'Baik' };
      if (score >= 55) return { grade: 'C', label: 'Cukup' };
      if (score > 0) return { grade: 'D', label: 'Kurang' };
      return { grade: 'E', label: 'Belum Ada Kegiatan' };
    };

    /** Aggregate the raw field numbers for one arbitrary slice of sessions. */
    const sliceStats = (slice: any[]) => {
      const ids = new Set(slice.map((s: any) => s.id));
      const sliceReports = reports.filter((r: any) => ids.has(r.sessionId));
      const attempts = (records.quizAttempts || []).filter((q: any) => ids.has(q.sessionId));
      const scored = attempts.filter((a: any) => typeof a.score === 'number');
      const closed = slice.filter((s: any) => s.status === 'closed' || s.status === 'completed').length;

      // Prefer the trainer-confirmed headcount from the report (it includes people
      // present without a phone); fall back to the online roster where none exists.
      const reportedHeads = sliceReports.reduce((sum: number, r: any) => sum + (r.totalParticipants || 0), 0);
      const rosterHeads = participants.filter((p: any) => ids.has(p.sessionId)).length;

      return {
        sessionCount: slice.length,
        closedCount: closed,
        participantCount: Math.max(reportedHeads, rosterHeads),
        quizAttemptCount: attempts.length,
        quizPassedCount: attempts.filter((a: any) => a.passed).length,
        averageScore: scored.length > 0
          ? Math.round(scored.reduce((s: number, a: any) => s + a.score, 0) / scored.length)
          : 0,
        materialCount: new Set(slice.map((s: any) => s.materialId)).size,
        lastActivityDate: slice.length > 0
          ? slice.map(sessionDate).sort().reverse()[0]
          : null,
      };
    };

    /** Turn a list of raw stat rows into ranked, graded KPI rows. */
    const scoreRows = (rows: Array<{ key: string; name: string; extra?: any; stats: any }>) => {
      const bestSessions = Math.max(0, ...rows.map(r => r.stats.sessionCount));
      const bestParticipants = Math.max(0, ...rows.map(r => r.stats.participantCount));

      return rows
        .map(r => {
          const s = r.stats;
          const activityScore = relScore(s.sessionCount, bestSessions);
          const reachScore = relScore(s.participantCount, bestParticipants);
          // Absolute: a 90-average is excellent whether or not anyone else scored higher.
          const qualityScore = Math.min(100, s.averageScore);
          const disciplineScore = s.sessionCount > 0
            ? Math.round((s.closedCount / s.sessionCount) * 100)
            : 0;

          const kpiScore = Math.round(
            (activityScore * KPI_WEIGHTS.activity +
              reachScore * KPI_WEIGHTS.reach +
              qualityScore * KPI_WEIGHTS.quality +
              disciplineScore * KPI_WEIGHTS.discipline) / 100
          );

          return {
            key: r.key,
            name: r.name,
            ...(r.extra || {}),
            ...s,
            passingRate: s.quizAttemptCount > 0
              ? Math.round((s.quizPassedCount / s.quizAttemptCount) * 100)
              : 0,
            components: {
              activity: activityScore,
              reach: reachScore,
              quality: qualityScore,
              discipline: disciplineScore,
            },
            kpiScore,
            ...kpiGrade(kpiScore),
          };
        })
        .sort((a, b) => b.kpiScore - a.kpiScore || b.sessionCount - a.sessionCount)
        .map((row, i) => ({ ...row, rank: i + 1 }));
    };

    // Per-trainer: every registered trainer appears, including those with zero
    // activity — an empty row is exactly the signal a supervisor needs.
    const trainerKpi = scoreRows(
      trainerUsers.map((t: any) => ({
        key: t.id,
        name: t.fullName,
        extra: {
          polda: t.polda || '-',
          polres: t.polres || '-',
          position: t.position || '-',
          unit: t.unit || '-',
        },
        stats: sliceStats(sessions.filter((s: any) => s.trainerId === t.id)),
      }))
    );

    // Per-Polres: only units that actually held activities in this filter window.
    const polresKeys = Array.from(new Set(sessions.map((s: any) => `${s.polda}||${s.polres}`)));
    const polresKpi = scoreRows(
      polresKeys.map(k => {
        const [pda, pres] = k.split('||');
        const slice = sessions.filter((s: any) => s.polda === pda && s.polres === pres);
        return {
          key: k,
          name: pres,
          extra: {
            polda: pda,
            trainers: Array.from(new Set(slice.map((s: any) => s.trainerName).filter(Boolean))),
          },
          stats: sliceStats(slice),
        };
      })
    );

    const poldaKeys = Array.from(new Set(sessions.map((s: any) => s.polda)));
    const poldaKpi = scoreRows(
      poldaKeys.map(pda => {
        const slice = sessions.filter((s: any) => s.polda === pda);
        return {
          key: pda,
          name: pda,
          extra: {
            polresCount: new Set(slice.map((s: any) => s.polres)).size,
            trainerCount: new Set(slice.map((s: any) => s.trainerId)).size,
          },
          stats: sliceStats(slice),
        };
      })
    );

    // Regions on the books that ran nothing in this window — the blank spots on
    // the map, which no ranking of active units would ever reveal.
    const activePoldaSet = new Set(poldaKeys);
    const inactivePolda = POLDA_REFERENCE.filter(p => !activePoldaSet.has(p));

    res.json({
      success: true,
      data: {
        totalMaterials,
        totalPublicMaterials,
        totalTrainers,
        activeTrainers,
        idleTrainers,
        totalSessions,
        totalCompletedSessions,
        totalParticipants,
        totalPublicViews,
        totalSessionViews,
        totalQuizAttempts,
        totalQuizCompleted,
        averageQuizScore,
        completionRate,
        popularMaterials,
        trainerPerformance,
        regionalHierarchy,
        activityTrend,
        levelBreakdown,
        scoreDistribution,
        statusBreakdown,
        recentActivity,
        trainerKpi,
        polresKpi,
        poldaKpi,
        inactivePolda,
        kpiWeights: KPI_WEIGHTS,
        generatedAt: new Date().toISOString(),
        executiveScope: {
          level: callerExecLevel || (callerRole === 'role-admin' ? 'nasional' : 'nasional'),
          polda: callerUser.polda || null,
          polres: callerUser.polres || null,
          poldaId: callerUser.poldaId || null,
          polresId: callerUser.polresId || null,
          isLockedToPolda: callerRole === 'role-executive' && callerExecLevel === 'polda',
          isLockedToPolres: callerRole === 'role-executive' && callerExecLevel === 'polres',
        },
        appliedFilters: {
          polda: effectivePolda || 'ALL',
          polres: effectivePolres || 'ALL',
          level: level ? String(level) : 'ALL',
          trainerId: trainerId ? String(trainerId) : 'ALL',
          startDate: startDate ? String(startDate) : null,
          endDate: endDate ? String(endDate) : null
        }
      }
    });
  });

  // Get Single Public Material
  app.get('/api/public/materials/:id', (req, res) => {
    const { id } = req.params;
    const material = materialsStore.find(m => m.id === id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Materi tidak ditemukan.' });
    }

    if (material.publishStatus === 'archived' || material.publicAccess === 'restricted') {
      return res.status(403).json({
        success: false,
        message: 'Materi ini bersifat terbatas dan tidak dapat diakses melalui portal publik umum.'
      });
    }

    // Return material with quiz hidden from public view mode
    const publicSafeMaterial = {
      ...material,
      quiz: [] // Explicitly hidden on public view mode
    };

    res.json({ success: true, data: publicSafeMaterial });
  });

  // === TRAINER PROFILE / KEDINASAN API ===

  // Update trainer kedinasan profile
  app.post('/api/profile/kedinasan', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'user-2';
    const { position, unit, polda, polres } = req.body;

    const userData = readUserData();
    const userIndex = userData.users.findIndex((u: any) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    // Update kedinasan fields
    if (position !== undefined) userData.users[userIndex].position = position;
    if (unit !== undefined) userData.users[userIndex].unit = unit;
    if (polda !== undefined) userData.users[userIndex].polda = polda;
    if (polres !== undefined) userData.users[userIndex].polres = polres;

    writeUserData(userData);

    const { password: _, ...safeUser } = userData.users[userIndex];
    res.json({
      success: true,
      data: safeUser,
      message: 'Informasi kedinasan berhasil diperbarui.'
    });
  });

  app.post('/api/ask-ai', async (req, res) => {
    const { messages } = req.body;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: `Kamu adalah Alesha AI, asisten AI untuk platform "E-Learning Dikmas Lantas" — Portal Katalog Materi Edukasi Keselamatan POLRI untuk jenjang TK/PAUD, SD, SMP, dan SMA, berisi modul interaktif, video edukasi, dan kuis evaluasi.

  Tugas kamu:
  - Jawab pertanyaan seputar KONTEN materi yang ada di platform ini: keselamatan berlalu lintas, rambu-rambu, etika berkendara, keamanan digital/cyberbullying, bahaya narkoba, dan topik terkait lain yang relevan untuk edukasi pelajar TK sampai SMA.
  - Bantu pengguna menemukan modul yang relevan di katalog (misal arahkan ke kategori jenjang atau jenis materi yang sesuai).
  - Jawab dengan bahasa yang ramah, singkat, jelas, dan sesuai usia pelajar (hindari istilah terlalu teknis/berat).
  - Kalau ditanya hal di luar topik keselamatan lalu lintas, keamanan digital, atau materi edukasi POLRI, arahkan sopan kembali ke topik platform ini — jangan menjawab topik yang sama sekali tidak berkaitan (misal: coding, gosip, politik, dsb).
  - Kamu TIDAK memberikan saran hukum resmi atau keputusan administratif (misal status SIM/tilang individu) — untuk itu arahkan ke layanan resmi POLRI (110 atau kantor Satlantas terdekat).`,
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text ?? 'Maaf, tidak ada jawaban.';
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ reply: 'Terjadi kesalahan server.' });
    }
  });

  // Global Express Error Handling Middleware (Catches unhandled route errors)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error]', err);
    const status = typeof err.status === 'number' ? err.status : 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Terjadi kesalahan internal pada server.',
      error: process.env.NODE_ENV === 'production' ? undefined : String(err)
    });
  });

  // Explicit JSON 404 for unhandled /api/* routes to prevent returning HTML index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`
    });
  });

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[POLRI E-Learning] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
