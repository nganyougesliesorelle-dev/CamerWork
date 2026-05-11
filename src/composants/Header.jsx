export function Header({ currentPage, onNavigate }) {
  return (
    <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold text-emerald-600">CamerWork</h1>
      <div className="space-x-4">
        <button onClick={() => onNavigate('home')} className="hover:text-emerald-500">Accueil</button>
        <button onClick={() => onNavigate('dashboard')} className="hover:text-emerald-500">Tableau de bord</button>
        <button onClick={() => onNavigate('profile')} className="hover:text-emerald-500">Profil</button>
      </div>
    </nav>
  );
}