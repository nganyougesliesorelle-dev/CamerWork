/**
 * SkeletonCard — Composant de chargement skeleton UI avec animate-pulse.
 * 
 * Variantes :
 *   - "card"   : carte d'offre d'emploi (image + 3 lignes)
 *   - "profile": avatar + 4 lignes
 *   - "chat"   : bulle de message
 *   - "list"   : liste simple (3 éléments)
 */
export function SkeletonCard({ variant = 'card', count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'card') {
    return (
      <div className="space-y-4">
        {items.map(i => (
          <div key={i} className="bg-white rounded-2xl border border-sky-100 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-sky-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-sky-200 rounded w-3/4" />
                <div className="h-2.5 bg-sky-100 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-sky-100 rounded w-full" />
              <div className="h-2 bg-sky-100 rounded w-5/6" />
            </div>
            <div className="flex gap-2 mt-3">
              <div className="h-5 bg-sky-100 rounded-full w-16" />
              <div className="h-5 bg-sky-100 rounded-full w-20" />
              <div className="h-5 bg-sky-100 rounded-full w-14" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className="bg-white rounded-2xl border border-sky-100 p-6 animate-pulse space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-sky-200 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-sky-200 rounded w-1/2" />
            <div className="h-3 bg-sky-100 rounded w-3/4" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 bg-sky-100 rounded w-full" />
          <div className="h-2.5 bg-sky-100 rounded w-5/6" />
          <div className="h-2.5 bg-sky-100 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (variant === 'chat') {
    return (
      <div className="space-y-4 p-4">
        {items.map(i => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`animate-pulse rounded-2xl p-4 ${i % 2 === 0 ? 'bg-white' : 'bg-cyan-100'} max-w-[70%]`}>
              <div className={`h-2.5 rounded w-32 mb-2 ${i % 2 === 0 ? 'bg-sky-100' : 'bg-cyan-200'}`} />
              <div className={`h-2 rounded w-24 ${i % 2 === 0 ? 'bg-sky-50' : 'bg-cyan-100'}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // variant "list"
  return (
    <div className="space-y-3">
      {items.map(i => (
        <div key={i} className="bg-white rounded-xl border border-sky-100 p-4 animate-pulse flex gap-3">
          <div className="w-8 h-8 bg-sky-200 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-sky-200 rounded w-2/3" />
            <div className="h-2 bg-sky-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
