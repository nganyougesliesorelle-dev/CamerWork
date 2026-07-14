/**
 * Module 1 — Simulateur d'Entretien Technique (Mock Interview)
 * Fonctionne 100% côté client. Banque de questions par stack tech.
 * Scoring sur /20 avec détection de mots-clés + conseils personnalisés.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Star, Brain, Trophy, RefreshCw, Code, CheckCircle2 } from 'lucide-react';
import { getQuestionsForStack, generateAdvice } from '../data/interviewQuestions';

const STACKS = [
  { key: 'react', label: 'React JS', icon: '⚛️' },
  { key: 'java', label: 'Java / Spring Boot', icon: '☕' },
  { key: 'flutter', label: 'Flutter', icon: '🐦' },
  { key: 'general', label: 'Général', icon: '💼' },
];

export function InterviewSimulator() {
  const navigate = useNavigate();
  const [selectedStack, setSelectedStack] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const startInterview = (stack) => {
    const qs = getQuestionsForStack(stack);
    setQuestions(qs);
    setSelectedStack(stack);
    setCurrentQ(0);
    setAnswer('');
    setResults([]);
    setShowResults(false);
    setTotalScore(0);
  };

  const evaluateAnswer = (q, ans) => {
    const lower = ans.toLowerCase();
    let matched = [];
    let missed = [];
    q.keywords.forEach(kw => {
      if (lower.includes(kw.toLowerCase())) matched.push(kw);
      else missed.push(kw);
    });
    const score = q.keywords.length > 0
      ? Math.round(((matched.length / q.keywords.length) * q.maxScore) * 10) / 10
      : 0;
    const advice = generateAdvice(missed, q.category);
    return { question: q.q, category: q.category, answer: ans, score, maxScore: q.maxScore, matched, missed, advice };
  };

  const handleNext = () => {
    if (!answer.trim()) return;
    const result = evaluateAnswer(questions[currentQ], answer);
    const newResults = [...results, result];
    setResults(newResults);
    setAnswer('');
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      const total = newResults.reduce((a, b) => a + b.score, 0);
      setTotalScore(Math.round(total * 10) / 10);
      setShowResults(true);
    }
  };

  const handleRestart = () => { setSelectedStack(null); setQuestions([]); setResults([]); setShowResults(false); };

  const getScoreColor = (s) => s >= 16 ? 'text-teal-500' : s >= 10 ? 'text-cyan-500' : 'text-amber-500';
  const getScoreBg = (s) => s >= 16 ? 'bg-teal-50 text-teal-700' : s >= 10 ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700';

  /* ─── ÉCRAN 1 : SÉLECTEUR DE STACK ─── */
  if (!selectedStack) {
    return (
      <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg dark:shadow-gray-900/30">
              <Code size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-sky-800 dark:text-gray-100">Simulateur d'Entretien</h1>
            <p className="text-sky-500 dark:text-gray-300 text-sm mt-1">Choisissez votre stack technique pour un entretien ciblé</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STACKS.map(s => (
              <button
                key={s.key}
                onClick={() => startInterview(s.key)}
                className="bg-white dark:bg-gray-800 border border-sky-100 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-gray-500 rounded-2xl p-5 text-left transition-all hover:shadow-md dark:shadow-gray-900/30 group"
              >
                <span className="text-2xl">{s.icon}</span>
                <p className="font-bold text-sky-800 dark:text-gray-100 mt-2 group-hover:text-cyan-600">{s.label}</p>
                <p className="text-xs text-sky-400 dark:text-gray-400 mt-0.5">5 questions · Score /20</p>
              </button>
            ))}
          </div>
          <button onClick={() => navigate(-1)} className="w-full py-3 text-sky-500 dark:text-gray-300 font-bold text-sm flex items-center justify-center gap-2 hover:text-sky-700 dark:hover:text-gray-200">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </div>
    );
  }

  /* ─── ÉCRAN 2 : RÉSULTATS ─── */
  if (showResults) {
    return (
      <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-20">
        <div className="bg-gradient-to-r from-sky-900 to-cyan-900 text-white py-6 px-4">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-xl"><ArrowLeft size={18} /></button>
            <h1 className="text-xl font-black">Résultats de l'entretien</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 mt-4 space-y-4">
          {/* Score global */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-sky-100 dark:border-gray-700 text-center shadow-sm dark:shadow-gray-900/30">
            <Trophy size={48} className="mx-auto mb-2 text-cyan-500" />
            <span className={`text-5xl font-black ${getScoreColor(totalScore)}`}>{totalScore}/20</span>
            <p className="text-sky-500 dark:text-gray-300 text-sm mt-1">
              {totalScore >= 16 ? '🌟 Excellent — vous maîtrisez parfaitement le sujet !'
                : totalScore >= 10 ? '👍 Bien — quelques points à approfondir.'
                : '📚 Continuez à vous préparer, vous progressez.'}
            </p>
            <button onClick={handleRestart} className="mt-4 px-6 py-3 bg-cyan-500 text-white rounded-xl font-black text-sm flex items-center gap-2 mx-auto hover:bg-cyan-600 transition-all">
              <RefreshCw size={14} /> Nouvel entretien
            </button>
          </div>
          {/* Détail par question */}
          {results.map((r, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase bg-sky-50 dark:bg-gray-800 px-2 py-1 rounded-lg">{r.category}</span>
                <span className={`text-sm font-black px-2 py-1 rounded-lg ${getScoreBg(r.score)}`}>
                  {r.score}/{r.maxScore}
                </span>
              </div>
              <p className="text-sm font-bold text-sky-800 dark:text-gray-100 mb-3">{r.question}</p>
              <p className="text-xs text-sky-500 dark:text-gray-300 bg-sky-50 dark:bg-gray-800 p-3 rounded-xl italic mb-3">« {r.answer} »</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {r.matched.map(kw => (
                  <span key={kw} className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 border border-teal-100 dark:border-teal-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    ✓ {kw}
                  </span>
                ))}
                {r.missed.map(kw => (
                  <span key={kw} className="bg-red-50 text-red-400 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold">
                    ✗ {kw}
                  </span>
                ))}
              </div>
              <p className="text-xs text-sky-600 dark:text-gray-300 flex items-start gap-1.5">
                <Brain size={14} className="shrink-0 mt-0.5 text-cyan-500" />
                <span>{r.advice}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── ÉCRAN 3 : FLUX DE QUESTIONS ─── */
  const q = questions[currentQ];
  const progress = (currentQ / questions.length) * 100;

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-20">
      <div className="bg-gradient-to-r from-sky-900 to-cyan-900 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={handleRestart} className="p-2 bg-white/10 rounded-xl"><ArrowLeft size={18} /></button>
          <div className="flex-1">
            <h1 className="text-xl font-black">Simulateur d'Entretien</h1>
            <p className="text-sky-300 dark:text-gray-400 text-xs">Question {currentQ + 1}/{questions.length} · {q.category}</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl text-cyan-500 shrink-0"><MessageSquare size={24} /></div>
            <div>
              <span className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase bg-sky-50 dark:bg-gray-800 px-2 py-1 rounded-lg">{q.category}</span>
              <p className="text-lg font-bold text-sky-800 dark:text-gray-100 mt-2">{q.question}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30">
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={5}
            className="w-full p-4 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm text-sky-800 dark:text-gray-100 outline-none border border-sky-100 dark:border-gray-700 resize-none focus:border-cyan-500"
            placeholder="Rédigez votre réponse ici... Soyez précis et structuré." />
          <button onClick={handleNext} disabled={!answer.trim()}
            className="w-full mt-3 py-3.5 bg-cyan-500 text-white rounded-xl font-black text-sm hover:bg-cyan-600 transition-all disabled:bg-sky-100 dark:disabled:bg-gray-700 disabled:text-sky-400 dark:disabled:text-gray-500">
            {currentQ < questions.length - 1 ? 'Question suivante' : 'Voir mes résultats'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30">
          <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase mb-2 flex items-center gap-2">
            <Star size={14} className="text-cyan-500" /> Conseils
          </h3>
          <ul className="text-xs text-sky-600 dark:text-gray-300 space-y-1">
            <li>• Structurez avec la méthode STAR (Situation, Tâche, Action, Résultat)</li>
            <li>• Mots-clés attendus : {q.keywords.slice(0, 4).join(', ')}...</li>
            <li>• Soyez concis mais précis — 3 à 5 phrases idéalement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
