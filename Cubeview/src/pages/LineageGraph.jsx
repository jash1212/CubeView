import { useEffect, useState } from "react";
import axios from "axios";
import ReactFlow, {
  MiniMap,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function LineageGraph() {
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const future= true;

  useEffect(() => {
    async function fetchLineage() {
      try {
        const lineageRes = await axios.get("/api/lineage/");
        const { nodes: backendNodes, edges: backendEdges } = lineageRes.data;

        if (!backendNodes || backendNodes.length === 0) {
          setError("❌ No lineage data found. Try syncing metadata first.");
          return;
        }

        setGraphData(lineageRes.data);

        // Generate nodes with better layout: grid positioning (simple example)
        const gridSize = 150;
        const nodesWithPos = backendNodes.map((n, i) => {
          const x = (i % 5) * gridSize + Math.random() * 50;
          const y = Math.floor(i / 5) * gridSize + Math.random() * 50;
          return {
            id: n.id.toString(),
            data: { label: n.label },
            position: { x, y },
            type: "default",
            style: {
              background: n.type === "table" ? "#9CA8B3" : "#D3D3D3",
              color: "#222",
              border: "1px solid #222",
              padding: 5,
              borderRadius: 5,
              fontSize: 12,
            },
          };
        });

        setNodes(nodesWithPos);

        // Map backend edges with correct keys
        const edgesFormatted = backendEdges.map((e, idx) => ({
          id: `e-${e.from}-${e.to}-${idx}`,
          source: e.from.toString(),
          target: e.to.toString(),
          label: e.detail || e.source || "", // show detail or source as label
          animated: true,
          style: { stroke: "#888" },
          labelStyle: { fontSize: 10, fill: "#555" },
          arrowHeadType: "arrowclosed",
        }));

        setEdges(edgesFormatted);
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load lineage data");
      }
    }

    fetchLineage();
  }, [setEdges, setNodes]);

  if(future){
    return( <div className="flex justify-center items-center h-[70vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-md shadow-lg rounded-2xl border border-gray-200">
          <CardContent className="flex flex-col items-center text-center p-6 space-y-4">
            <div className="bg-yellow-100 p-4 rounded-full">
              <AlertTriangle className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold">Data Lineage</h2>
            <p className="text-muted-foreground leading-relaxed">
              🚧 This feature will be available in the next release.
              <br />
              The backend is ready — UI coming soon!
            </p>
            <Button disabled className="opacity-70">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
  
}

  if (error)
    return (
      <div
        style={{
          padding: 20,
          color: "red",
          fontWeight: "bold",
          fontSize: 16,
          textAlign: "center",
        }}
      >
        {error}
      </div>
    );

  if (!graphData)
    return (
      <div style={{ padding: 20, fontSize: 16, textAlign: "center" }}>
        Loading lineage graph...
      </div>
    );

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        attributionPosition="bottom-left"
      >
        <MiniMap
          nodeColor={(n) => (n.style?.background || "#eee")}
          nodeStrokeWidth={2}
          zoomable
          pannable
        />
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
