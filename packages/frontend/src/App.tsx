import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { FileManager } from './pages/FileManager';
import { Viewer } from './pages/Viewer';
import { AiGenerate } from './pages/AiGenerate';
import { GraphQA } from './pages/GraphQA';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="files" element={<FileManager />} />
            <Route path="viewer/:fileId?" element={<Viewer />} />
            <Route path="ai-generate" element={<AiGenerate />} />
            <Route path="graph-qa" element={<GraphQA />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
