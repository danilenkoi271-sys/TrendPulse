import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CursorRing, ScrollBar } from './components/landing/motion';
import { Header } from './components/Header';
import { useAuth } from './hooks/useAuth';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Markets from './pages/Markets';
import ArtistPage from './pages/Artist';
import Portfolio from './pages/Portfolio';

function Protected() {
  const { session, loading } = useAuth();
  if (loading) return <main className="page"><div className="skeleton" aria-busy="true" /></main>;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollTop />
      <ScrollBar />
      <CursorRing />
      <Header />
      <div className="route" key={pathname}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth />} />
        <Route element={<Protected />}>
          <Route path="/markets" element={<Markets />} />
          <Route path="/artists/:id" element={<ArtistPage />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Route>
        <Route path="*" element={<main className="page"><h1>Page not found</h1></main>} />
      </Routes>
      </div>
    </>
  );
}
