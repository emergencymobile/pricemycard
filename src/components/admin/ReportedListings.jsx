import React, { useState, useEffect, useMemo } from "react";
import { ExternalLink, RotateCcw, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { buildReportSummary } from "@/lib/listingReports";

const STATUS_STYLES = {
  "Auto-hidden": "bg-red-500/15 text-red-400 border-red-500/30",
  "Manually hidden": "bg-red-500/15 text-red-400 border-red-500/30",
  Flagged: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function ReportedListings() {
  const [reports, setReports] = useState([]);
  const [moderations, setModerations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [thresholdInput, setThresholdInput] = useState("3");
  const [sort, setSort] = useState("count");
  const [loading, setLoading] = useState(true);
  const [savingTh, setSavingTh] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    try {
      const [r, m, s] = await Promise.all([
        base44.entities.ListingReport.list("-created_date", 500),
        base44.entities.ListingModeration.list("-updated_date", 200),
        base44.entities.ReportSettings.list("-updated_date", 5),
      ]);
      setReports(r || []);
      setModerations(m || []);
      const rec = s && s[0] ? s[0] : null;
      setSettings(rec);
      setThresholdInput(String(rec?.auto_hide_threshold ?? 3));
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const threshold = settings?.auto_hide_threshold ?? 3;

  const summary = useMemo(() => {
    const map = buildReportSummary(reports);
    const modBy = new Map((moderations || []).filter(Boolean).map((m) => [m.listing_url, m]));
    const rows = Array.from(map.values()).map((s) => {
      const mod = modBy.get(s.url);
      let status = "Flagged";
      if (mod?.status === "manual_hide") status = "Manually hidden";
      else if (s.users.size >= threshold) status = "Auto-hidden";
      else if (s.count > 0) status = "Flagged";
      else status = "Active";
      return {
        url: s.url,
        title: Array.from(s.titles)[0] || "(no title)",
        count: s.count,
        uniqueUsers: s.users.size,
        froms: Array.from(s.froms),
        latest: s.latest,
        status,
      };
    });
    rows.sort((a, b) => {
      if (sort === "count") return b.count - a.count || (b.latest > a.latest ? 1 : -1);
      if (sort === "recent") return b.latest > a.latest ? 1 : -1;
      if (sort === "page") return (a.froms[0] || "").localeCompare(b.froms[0] || "");
      return 0;
    });
    return rows;
  }, [reports, moderations, threshold, sort]);

  const upsertModeration = async (url, title, status) => {
    const existing = moderations.find((m) => m.listing_url === url);
    if (existing) {
      const updated = await base44.entities.ListingModeration.update(existing.id, { status });
      setModerations((prev) => prev.map((m) => (m.id === existing.id ? updated : m)));
    } else {
      const created = await base44.entities.ListingModeration.create({ listing_url: url, listing_title: title, status });
      setModerations((prev) => [created, ...prev]);
    }
  };

  const handleRestore = async (row) => {
    try {
      await upsertModeration(row.url, row.title, "manual_restore");
      toast({ title: "Listing restored" });
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  const handleHide = async (row) => {
    try {
      await upsertModeration(row.url, row.title, "manual_hide");
      toast({ title: "Listing hidden" });
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  const saveThreshold = async () => {
    setSavingTh(true);
    try {
      const val = Number(thresholdInput) || 3;
      if (settings) {
        const updated = await base44.entities.ReportSettings.update(settings.id, { auto_hide_threshold: val });
        setSettings(updated);
      } else {
        const created = await base44.entities.ReportSettings.create({ auto_hide_threshold: val });
        setSettings(created);
      }
      toast({ title: "Threshold saved" });
    } catch {
      toast({ title: "Could not save threshold", variant: "destructive" });
    } finally {
      setSavingTh(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Threshold setting */}
      <div className="bg-secondary rounded-xl p-4 flex items-end gap-3 flex-wrap">
        <div>
          <Label className="text-xs text-muted-foreground">Auto-hide threshold (unique users)</Label>
          <Input
            type="number"
            min={1}
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            className="w-32 rounded-lg mt-1"
          />
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={saveThreshold} disabled={savingTh}>
          <Save className="w-4 h-4 mr-1" /> {savingTh ? "Saving..." : "Save"}
        </Button>
        <p className="text-xs text-muted-foreground ml-auto">
          Listings with ≥ {threshold} unique user {threshold === 1 ? "report" : "reports"} are auto-hidden from search results.
        </p>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort by:</span>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44 rounded-lg h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Report count</SelectItem>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="page">Card page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reported listings */}
      {summary.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No reports yet.</div>
      ) : (
        <div className="space-y-2">
          {summary.map((row) => (
            <div key={row.url} className="bg-secondary rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{row.title}</p>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    View on eBay <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Badge className={`text-[10px] ${STATUS_STYLES[row.status] || ""}`}>{row.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{row.count}</span> reports
                </span>
                <span>
                  <span className="font-medium text-foreground">{row.uniqueUsers}</span> unique users
                </span>
                {row.froms.length > 0 && (
                  <span>
                    From: <span className="font-medium text-foreground">{row.froms.join(", ")}</span>
                  </span>
                )}
                {row.latest && <span>{new Date(row.latest).toLocaleDateString()}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                {(row.status === "Auto-hidden" || row.status === "Manually hidden") && (
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleRestore(row)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                  </Button>
                )}
                {row.status !== "Manually hidden" && (
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleHide(row)}>
                    <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}