import React, { useEffect, useState, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ CHANGED: Correct import
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Download } from "lucide-react";
import api from "../api";


// NOTE: install these packages if you haven't already:
// npm install jspdf jspdf-autotable html2canvas

const COLORS = ["#0088FE", "#FF8042", "#00C49F", "#FFBB28"];

export default function ReportDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function fetchReport() {
      try {
        const res = await api.get("/api/report-summary/");
        if (!mounted) return;
        setData(res.data);
      } catch (err) {
        const msg =
          err.response?.data?.detail || err.response?.statusText || err.message || "Unknown error";
        if (!mounted) return;
        setError(msg);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    fetchReport();
    return () => { mounted = false; };
  }, []);

  // ✅ CHANGED: The entire function is updated to use autoTable(doc, ...)
  const downloadPDF = async () => {
    if (!data) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Cover
      doc.setFontSize(22);
      doc.setTextColor(34, 45, 50);
      doc.text("Data Quality Report", pageWidth / 2, 60, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 80, { align: "center" });

      // Summary block on cover
      doc.setFontSize(10);
      const summaryStartY = 110;
      const summaryRows = [
        ["Health Score", `${data.health_score}%`],
        ["Total Incidents", String(data.total_incidents)],
        ["Resolved", String(data.resolved_incidents)],
        ["Unresolved", String(data.unresolved_incidents)],
        ["Tables Monitored", String(data.tables_monitored)],
        ["Rules Active", String(data.rules_active ?? 0)],
      ];
      autoTable(doc, {
        head: [["Metric", "Value"]],
        body: summaryRows,
        startY: summaryStartY,
        theme: "grid",
        headStyles: { fillColor: [8, 136, 254] },
      });

      // Visual snapshot of the in-page charts (screenshot the reportRef area)
      if (reportRef.current) {
        await new Promise((r) => setTimeout(r, 250));
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Dashboard Snapshot", 40, 40);
        const margin = 40;
        const maxImgWidth = pageWidth - margin * 2;
        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = maxImgWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(imgData, "PNG", margin, 60, imgWidth, imgHeight);
      }

      // Top tables
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Top Tables", 40, 40);
      autoTable(doc, {
        startY: 60,
        head: [["Table", "Incidents"]],
        body: (data.top_tables || []).map((t) => [t.table, String(t.count)]),
        headStyles: { fillColor: [8, 136, 254] },
      });

      // Rule compliance
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Rule Compliance", 40, 40);
      autoTable(doc, {
        startY: 60,
        head: [["Rule", "Last Run", "Result"]],
        body: (data.rule_compliance || []).map((r) => [r.rule_name, r.last_run || "Never", r.last_result || "N/A"]),
        headStyles: { fillColor: [8, 136, 254] },
      });

      // Footer page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
      }

      doc.save(`cubeview-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Failed to generate PDF. See console for details.');
    }
  };

  if (loading) return <div className="p-6">Loading report...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-6">No data available</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header + Download button */}
      <div className="flex items-center justify-between gap-4">
        <motion.h1 className="text-3xl font-bold text-gray-800" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          Data Quality Report
        </motion.h1>

        <motion.button
          ref={btnRef}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadPDF}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl focus:outline-none"
        >
          <Download size={16} />
          <span className="font-medium">Download PDF</span>
        </motion.button>
      </div>

      {/* Content that will be screenshotted into PDF */}
      <div ref={reportRef} className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[{ label: "Health Score", value: `${data.health_score}%` }, { label: "Total Incidents", value: data.total_incidents }, { label: "Resolved", value: data.resolved_incidents }, { label: "Unresolved", value: data.unresolved_incidents }, { label: "Tables Monitored", value: data.tables_monitored }].map((metric, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * idx }}>
              <Card className="p-4 shadow border">
                <CardContent>
                  <div className="text-sm text-gray-500">{metric.label}</div>
                  <div className="text-xl font-bold">{metric.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h2 className="font-semibold mb-2">Incident Breakdown</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={Object.entries(data.incident_breakdown).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {Object.entries(data.incident_breakdown).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-2">Health Score Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.health_score_trend}>
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="health_score" stroke="#0088FE" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Tables */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Top Tables</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th>Table</th>
                <th>Incidents</th>
              </tr>
            </thead>
            <tbody>
              {data.top_tables.map((t, idx) => (
                <tr key={idx} className="border-t">
                  <td>{t.table}</td>
                  <td>{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Rule Compliance */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Rule Compliance</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th>Rule</th>
                <th>Last Run</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rule_compliance.map((rule, idx) => (
                <tr key={idx} className="border-t">
                  <td>{rule.rule_name}</td>
                  <td>{rule.last_run || "Never"}</td>
                  <td>
                    {rule.last_result ? (
                      <Badge variant={rule.last_result === "pass" ? "success" : "destructive"}>{rule.last_result}</Badge>
                    ) : (
                      <Badge variant="secondary">N/A</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Metadata */}
        <Card className="p-4 flex items-center gap-2">
          <Clock size={20} className="text-gray-500" />
          <span className="text-gray-700">{data.metadata_export_info.last_export || "No exports yet"}</span>
        </Card>
      </div>
    </div>
  );
}