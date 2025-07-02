import React, { useEffect, useState } from "react";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

const Incidents = () => {
    const [availableTables, setAvailableTables] = useState([]);
    const [availableTypes, setAvailableTypes] = useState([]);

    const [incidents, setIncidents] = useState([]);
    const [filters, setFilters] = useState({ status: "", table: "", type: "" });
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ total: 0, resolved: 0, ongoing: 0 });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await api.get("/api/incidents/filters/");
                setAvailableTables(res.data.tables);
                setAvailableTypes(res.data.types);
            } catch (err) {
                console.error("Failed to load filter options", err);
            }
        };
        fetchOptions();
    }, []);

    useEffect(() => {
        fetchIncidents();
    }, [filters]);

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(filters);
            const res = await api.get(`/api/incidents/?${params}`);
            const data = res.data;
            setIncidents(data);

            // Count summary
            const resolved = data.filter((i) => i.status === "resolved").length;
            const ongoing = data.filter((i) => i.status === "ongoing").length;
            setSummary({
                total: data.length,
                resolved,
                ongoing,
            });
        } catch (err) {
            console.error("Failed to fetch incidents", err);
        } finally {
            setLoading(false);
        }
    };

    const resolveIncident = async (id) => {
        try {
            await api.patch(`/api/incidents/${id}/resolve/`);
            fetchIncidents();
        } catch (err) {
            console.error("Failed to resolve incident", err);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-gray-800">Incidents</h1>

            {/* Summary */}
            <div className="flex gap-6 text-sm text-gray-700">
                <span>🧾 Total: <strong>{summary.total}</strong></span>
                <span>✅ Resolved: <strong>{summary.resolved}</strong></span>
                <span>⚠️ Ongoing: <strong>{summary.ongoing}</strong></span>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                {/* Table Filter */}
                <Select
                    value={filters.table || "all"}
                    onValueChange={(value) =>
                        setFilters({ ...filters, table: value === "all" ? "" : value })
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by table" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tables</SelectItem>
                        {availableTables.map((table) => (
                            <SelectItem key={table} value={table}>
                                {table}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select
                    value={filters.type || "all"}
                    onValueChange={(value) =>
                        setFilters({ ...filters, type: value === "all" ? "" : value })
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {availableTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                        setFilters({ ...filters, status: value === "all" ? "" : value })
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Filter indicator */}
            {(filters.table || filters.type || filters.status) && (
                <div className="text-xs text-gray-500 italic">
                    Showing filtered results.
                </div>
            )}

            {/* Incident List */}
            {loading ? (
                <p className="text-gray-500">Loading incidents...</p>
            ) : incidents.length === 0 ? (
                <div className="text-center text-sm text-gray-500 mt-8">
                    No incidents found. 🎉
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {incidents
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .map((incident) => (
                            <Card key={incident.id}>
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-lg font-bold">{incident.title}</h2>
                                            <p className="text-sm text-gray-600">{incident.description}</p>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded font-medium ${incident.status === "resolved"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {incident.status.toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="text-sm text-gray-500 space-y-1">
                                        <p>📌 Table: {incident.table_name || "N/A"}</p>
                                        <p>🕒 Created: {new Date(incident.created_at).toLocaleString()}</p>
                                        {incident.resolved_at && (
                                            <p>✅ Resolved: {new Date(incident.resolved_at).toLocaleString()}</p>
                                        )}
                                    </div>

                                    {incident.status === "ongoing" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => resolveIncident(incident.id)}
                                        >
                                            Mark as Resolved
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}
        </div>
    );
};

export default Incidents;
