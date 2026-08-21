import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AppLayout from './components/layout/AppLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Landing Page (Central Hub) */}
        <Route path="/" element={<Home />} />
        
        {/* Dynamic Route for individual Apps */}
        <Route path="/app/:appId" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
