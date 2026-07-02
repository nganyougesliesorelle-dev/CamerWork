export function Header({ onNavigate }) {
  return (
    <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold text-teal-600">CamerWork</h1>
      <div className="space-x-4">
        <button onClick={() => onNavigate('home')} className="hover:text-teal-500">Accueil</button>
        <button onClick={() => onNavigate('dashboard')} className="hover:text-teal-500">Tableau de bord</button>
        <button onClick={() => onNavigate('profile')} className="hover:text-teal-500">Profil</button>
      </div>
    </nav>
  );
}