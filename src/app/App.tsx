import { lazy, Suspense, useEffect, useState } from 'react';
import SimpleApp from '../features/lab/SimpleApp';
const AdvancedApp = lazy(() => import('../features/advanced/AdvancedApp'));
export default function App() {
  const [advanced, setAdvanced] = useState(location.hash === '#advanced');
  useEffect(() => {
    const change = () => setAdvanced(location.hash === '#advanced');
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  if (advanced)
    return (
      <>
        <a className="back-simple" href="#">
          ← Voltar ao modo simples
        </a>
        <Suspense fallback={<p className="empty">Abrindo ferramentas avançadas…</p>}>
          <AdvancedApp />
        </Suspense>
      </>
    );
  return <SimpleApp />;
}
