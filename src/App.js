import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/report" element={<ReportsPage />} />
        <Route path="/" element={<ReportsPage />} />
      </Routes>
    </Router>
  );
}

export default App;