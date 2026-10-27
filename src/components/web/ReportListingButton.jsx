import React, { useState, useEffect } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const REASONS = [
  { value: "wrong_card", label: "Wrong card" },
  { value: "wrong_variant", label: "Wrong variant/edition" },
  { value: "wrong_condition", label: "Wrong grading/condition" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Other" },
];

// Unobtrusive flag button shown on each eBay listing row. Logged-out users are
// redirected to login (and return to the same page); logged-in users get a
// small modal to submit a reason. Once reported, the button shows a "Reported"
// state and can't be submitted again for the same listing.
export default function ReportListingButton({ listing, reportedFrom, reported, onReported }) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(null);
  const [reason, setReason] = useState("wrong_card");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth
      .isAuthenticated()
      .then(setAuthed)
      .catch(() => setAuthed(false));
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (reported) return;
    if (authed === false) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await base44.entities.ListingReport.create({
        listing_url: listing.url,
        listing_title: listing.title || "",
        reported_from: reportedFrom || "",
        reason,
        comment: comment.trim(),
      });
      onReported?.(listing.url);
      toast({ title: "Thanks, we'll review this listing" });
      setOpen(false);
      setComment("");
      setReason("wrong_card");
    } catch {
      toast({ title: "Could not submit report", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={reported ? "Reported" : "Report as irrelevant"}
        aria-label={reported ? "Reported" : "Report as irrelevant"}
        className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors shrink-0 ${
          reported
            ? "text-emerald-500"
            : "text-muted-foreground/50 hover:text-amber-400 hover:bg-secondary"
        }`}
      >
        <Flag className={`w-3.5 h-3.5 ${reported ? "fill-current" : ""}`} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Why is this listing irrelevant?</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
              {REASONS.map((r) => (
                <div key={r.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`rep-${r.value}`} value={r.value} />
                  <Label htmlFor={`rep-${r.value}`} className="text-sm font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment..."
              className="text-sm rounded-lg min-h-[64px]"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}