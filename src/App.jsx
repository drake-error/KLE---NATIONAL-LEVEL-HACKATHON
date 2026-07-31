import React, { useState } from 'react';
import DashboardLayout from './features/dashboard/DashboardLayout';
import { IntroAnimation } from './components/IntroAnimation';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <>
      {showIntro && <IntroAnimation onDone={() => setShowIntro(false)} />}
      <DashboardLayout />
    </>
  );
}
