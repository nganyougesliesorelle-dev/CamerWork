import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Star, Brain, CheckCircle2, XCircle, RefreshCw, Trophy } from 'lucide-react';

const QUESTIONS = [
  { id: 1, q: "Parlez-moi de vous et de votre parcours professionnel.", keywords: ["expérience", "formation", "diplôme", "stage", "projet"], category: "Présentation" },
  { id: 2, q: "Pourquoi avez-vous postulé à ce poste spécifique ?", keywords: ["motivation", "entreprise", "mission", "valeur", "intérêt", "passion"], category: "Motivation" },
  { id: 3, q: "Quelle est votre plus grande réalisation professionnelle ?", keywords: ["réussite", "résultat", "équipe", "impact", "solution", "objectif"], category: "Réalisations" },
  { id: 4, q: "Comment gérez-vous les situations de stress ou les délais serrés ?", keywords: ["priorité", "organisation", "calme", "méthode", "communication", "planification"], category: "Soft Skills" },
  { id: 5, q: "Où vous voyez-vous dans 5 ans professionnellement ?", keywords: ["évolution", "carrière", "compétence", "leadership", "apprentissage", "ambition"], category: "Vision" },
];

export function InterviewSimulator() {
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const evaluateAnswer = (q, ans) => {
    const lower = ans.toLowerCase();
    let matched = 0;
    q.keywords.forEach(kw => { if (lower.includes(kw)) matched++; });
    const pct = Math.round((matched / q.keywords.length) * 100);
    const feedback = pct >= 60 ? "Excellente réponse !" : pct >= 30 ? "Bien, approfondissez." : "Trop court, développez davantage.";
    return { question: q.q, category: q.category, answer: ans, score: pct, feedback };
  };

  const handleNext = () => {
    if (!answer.trim()) return;
    const result = evaluateAnswer(QUESTIONS[currentQ], answer);
    const newResults = [...results, result];
    setResults(newResults);
    setAnswer('');
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      const avg = Math.round(newResults.reduce((a, b) => a + b.score, 0) / newResults.length);
      setTotalScore(avg);
      setShowResults(true);
    }
  };

  const handleRestart = () => { setCurrentQ(0); setAnswer(''); setResults([]); setShowResults(false); setTotalScore(0); };

  const getScoreColor = (s) => s >= 70 ? 'text-teal-500' : s >= 40 ? 'text-cyan-500' : 'text-amber-500';

  if (showResults) {
    return (
      <div className="min-h-screen bg-sky-50 font-sans antialiased pb-20">
        <div className="bg-gradient-to-r from-sky-900 to-cyan-900 text-white py-6 px-4">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-xl"><ArrowLeft size={18} /></button>
            <h1 className="text-xl font-black">Résultats de l'entretien</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 mt-4 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-sky-100 text-center">
            <Trophy size={48} className="mx-auto mb-2 text-cyan-500" />
            <span className={`text-4xl font-black ${getScoreColor(totalScore)}`}>{totalScore}%</span>
            <p className="text-sky-500 text-sm mt-1">Score global sur {QUESTIONS.length} questions</p>
            <button onClick={handleRestart} className="mt-4 px-6 py-3 bg-cyan-500 text-white rounded-xl font-black text-sm flex items-center gap-2 mx-auto"><RefreshCw size={14} /> Recommencer</button>
          </div>
          {results.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-sky-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-sky-400 uppercase">{r.category}</span>
                <span className={`text-sm font-black ${getScoreColor(r.score)}`}>{r.score}%</span>
              </div>
              <p className="text-sm font-bold text-sky-800 mb-2">{r.question}</p>
              <p className="text-xs text-sky-500 bg-sky-50 p-3 rounded-xl italic">"{r.answer}"</p>
              <p className="text-xs text-sky-600 mt-2 flex items-center gap-1"><Brain size={12} /> {r.feedback}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const q = QUESTIONS[currentQ];
  const progress = ((currentQ) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen bg-sky-50 font-sans antialiased pb-20">
      <div className="bg-gradient-to-r from-sky-900 to-cyan-900 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-xl"><ArrowLeft size={18} /></button>
          <div className="flex-1">
            <h1 className="text-xl font-black">Simulateur d'Entretien</h1>
            <p className="text-sky-300 text-xs">Question {currentQ + 1}/{QUESTIONS.length} · {q.category}</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-4">
        <div className="bg-white rounded-2xl p-6 border border-sky-100">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-cyan-50 rounded-xl text-cyan-500 shrink-0"><MessageSquare size={24} /></div>
            <div>
              <span className="text-[10px] font-black text-sky-400 uppercase">{q.category}</span>
              <p className="text-lg font-bold text-sky-800 mt-1">{q.question}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-sky-100">
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={5}
            className="w-full p-4 bg-sky-50 rounded-xl text-sm text-sky-800 outline-none border border-sky-100 resize-none focus:border-cyan-500"
            placeholder="Rédigez votre réponse ici... Soyez précis et structuré." />
          <button onClick={handleNext} disabled={!answer.trim()}
            className="w-full mt-3 py-3.5 bg-cyan-500 text-white rounded-xl font-black text-sm hover:bg-cyan-600 transition-all disabled:bg-sky-100 disabled:text-sky-400">
            {currentQ < QUESTIONS.length - 1 ? 'Question suivante' : 'Voir mes résultats'}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-sky-100">
          <h3 className="text-xs font-black text-sky-800 uppercase mb-2 flex items-center gap-2"><Star size={14} className="text-cyan-500" /> Conseils</h3>
          <ul className="text-xs text-sky-600 space-y-1">
            <li>• Structurez avec la méthode STAR (Situation, Tâche, Action, Résultat)</li>
            <li>• Utilisez des mots-clés pertinents : {q.keywords.slice(0, 3).join(', ')}...</li>
            <li>• Soyez concis mais précis — 3 à 5 phrases idéalement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
