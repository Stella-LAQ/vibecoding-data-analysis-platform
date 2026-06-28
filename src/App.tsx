import { Routes, Route } from "react-router";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import DataPreview from "@/pages/DataPreview";
import Analysis from "@/pages/Analysis";
import Predict from "@/pages/Predict";
import Export from "@/pages/Export";
import About from "@/pages/About";

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/preview" element={<DataPreview />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/export" element={<Export />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </MainLayout>
  );
}
