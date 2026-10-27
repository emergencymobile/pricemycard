import React, { useState, useEffect } from "react";
import { Check, X, Smartphone, Tablet, Monitor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const deviceIcon = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  unknown: Monitor,
};

export default function AccessRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const data = await base44.entities.AccessRequest.list("-created_date", 100);
      setRequests(data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (id, action) => {
    setProcessing(id);
    try {
      const res = await base44.functions.invoke("reviewAccessRequest", { request_id: id, action });
      if (res.data?.error) {
        toast({ title: res.data.error, variant: "destructive" });
      } else {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === "approve" ? "approved" : "denied" } : r));
        toast({ title: action === "approve" ? "Access granted" : "Request denied" });
      }
    } catch (err) {
      toast({ title: "Could not process request", variant: "destructive" });
    }
    setProcessing(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const pending = requests.filter(r => r.status === "pending");
  const reviewed = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Pending ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(r => {
              const DeviceIcon = deviceIcon[r.device_type] || Monitor;
              return (
                <div key={r.id} className="bg-secondary rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.user_email || "Unknown user"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <DeviceIcon className="w-3 h-3" /> {r.device_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                        onClick={() => review(r.id, "approve")}
                        disabled={processing === r.id}
                      >
                        <Check className="w-3.5 h-3.5" /> Grant
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => review(r.id, "deny")}
                        disabled={processing === r.id}
                      >
                        <X className="w-3.5 h-3.5" /> Deny
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground bg-background/40 rounded-lg p-3 mt-2">{r.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Reviewed ({reviewed.length})</h3>
          <div className="space-y-2">
            {reviewed.map(r => {
              const DeviceIcon = deviceIcon[r.device_type] || Monitor;
              return (
                <div key={r.id} className="bg-secondary/50 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.user_email || "Unknown user"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <DeviceIcon className="w-3 h-3" /> {r.device_type}
                      </Badge>
                      <Badge className={r.status === "approved" ? "bg-emerald-600 text-white text-[10px]" : "bg-destructive text-destructive-foreground text-[10px]"}>
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No access requests yet.</p>
      )}
    </div>
  );
}