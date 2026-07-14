/**
 * CvGenerator — Génération de CV professionnel au format PDF.
 * 
 * Utilise jsPDF pour créer un PDF côté client à partir des données
 * du profil candidat. Aucun appel serveur.
 * 
 * Usage :
 *   <button onClick={() => generatePDF(profileData)}>
 *     Télécharger mon CV
 *   </button>
 */
import { useState } from 'react';
import { FileText, Download, Loader } from 'lucide-react';

/**
 * Génère et télécharge un CV PDF à partir des données du profil.
 * @param {Object} profile — Données du candidat (voir structure ci-dessous)
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function generatePDF(profile) {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  let y = 25;

  // ─── Police & styles ───
  const leftMargin = 20;
  const rightMargin = 190;

  // ─── En-tête ───
  doc.setFillColor(14, 116, 144); // sky-800
  doc.rect(0, 0, pageW, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text((profile.displayName || profile.fullName || 'Candidat').toUpperCase(), leftMargin, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(profile.title || 'Développeur Full-Stack', leftMargin, 30);

  doc.setFontSize(9);
  const contactLine = [
    profile.email,
    profile.phone,
    profile.location,
  ].filter(Boolean).join('  •  ');
  doc.text(contactLine, leftMargin, 37);

  y = 55;

  // ─── Résumé ───
  if (profile.summary) {
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉSUMÉ', leftMargin, y);
    y += 5;
    doc.setDrawColor(14, 116, 144);
    doc.line(leftMargin, y, leftMargin + 25, y);
    y += 7;

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(profile.summary, rightMargin - leftMargin);
    doc.text(lines, leftMargin, y);
    y += lines.length * 5 + 5;
  }

  // ─── Compétences ───
  if (profile.skills?.length) {
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPÉTENCES', leftMargin, y);
    y += 5;
    doc.line(leftMargin, y, leftMargin + 30, y);
    y += 7;

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    const skillsText = profile.skills.join('  •  ');
    const skillLines = doc.splitTextToSize(skillsText, rightMargin - leftMargin);
    doc.text(skillLines, leftMargin, y);
    y += skillLines.length * 5 + 5;
  }

  // ─── Expérience ───
  if (profile.experience?.length) {
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPÉRIENCE', leftMargin, y);
    y += 5;
    doc.line(leftMargin, y, leftMargin + 28, y);
    y += 7;

    profile.experience.forEach(exp => {
      if (y > 260) { doc.addPage(); y = 25; }
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${exp.role} — ${exp.company}`, leftMargin, y);
      y += 5;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(exp.period || '', leftMargin, y);
      y += 4;
      if (exp.description) {
        doc.setTextColor(71, 85, 105);
        const descLines = doc.splitTextToSize(exp.description, rightMargin - leftMargin);
        doc.text(descLines, leftMargin, y);
        y += descLines.length * 4.5 + 3;
      }
    });
    y += 3;
  }

  // ─── Formation ───
  if (profile.education?.length) {
    if (y > 240) { doc.addPage(); y = 25; }
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMATION', leftMargin, y);
    y += 5;
    doc.line(leftMargin, y, leftMargin + 25, y);
    y += 7;

    profile.education.forEach(edu => {
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${edu.degree} — ${edu.school}`, leftMargin, y);
      y += 4.5;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(edu.year || '', leftMargin, y);
      y += 6;
    });
  }

  // ─── Langues ───
  if (profile.languages?.length) {
    if (y > 260) { doc.addPage(); y = 25; }
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('LANGUES', leftMargin, y);
    y += 5;
    doc.line(leftMargin, y, leftMargin + 22, y);
    y += 7;

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.text(profile.languages.join(', '), leftMargin, y);
  }

  // ─── Pied de page ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`CamerWork — CV généré automatiquement — Page ${i}/${pageCount}`, pageW / 2, 290, { align: 'center' });
  }

  doc.save(`CV_${(profile.displayName || profile.fullName || 'candidat').replace(/\s/g, '_')}.pdf`);
}

/**
 * Bouton de génération de CV avec état de chargement.
 */
export function CvGeneratorButton({ profile, className = '' }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generatePDF(profile);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    }
    setGenerating(false);
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl text-xs font-black hover:from-sky-600 hover:to-cyan-600 transition-all shadow-md disabled:opacity-60 ${className}`}
    >
      {generating ? (
        <><Loader size={14} className="animate-spin" /> Génération...</>
      ) : (
        <><Download size={14} /> Télécharger CV PDF</>
      )}
    </button>
  );
}
