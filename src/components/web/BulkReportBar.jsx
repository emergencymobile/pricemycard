import React, { useState } from "react";
import { Flag, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const REASONS = [
  { value: "wrong_card", label: "Wrong card" },
  { value: "wrong_variant", label: "Wrong variant/edition" },
  { value: "wrong_condition", label: "Wrong grading/condition" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Other" },
];

// Floating action bar shown when the user is in multi-select report mode.
// Displays the number of selected listings and a Report button that opens a
// reason dialog — the chosen reason + comment apply to every selected
// listing in one bulk submission.
export default function BulkReportBar({ selectedCount, onCancel, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong_card");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(reason, comment.trim());
      setOpen(false);
      setComment("");
      setReason("wrong_card");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 bg-card border border-border rounded-2xl shadow-xl px-3 sm:px-4 py-2.5 sm:py-3 max-w-[calc(100%-1.5rem)]">
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} selected
        </span>
        <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-lg h-8">
          <X className="w-4 h-4" /> Cancel
        </Button>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg h-8"
          onClick={() => setOpen(true)}
          disabled={selectedCount === 0}
        >
          <Flag className="w-3.5 h-3.5" /> Report{selectedCount > 0 ? ` ${selectedCount}` : ""}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report {selectedCount} {selectedCount === 1 ? "listing" : "listings"} as irrelevant?</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick a reason — it applies to all selected listings.
            </p>
            <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
              {REASONS.map((r) => (
                <div key={r.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`bulk-${r.value}`} value={r.value} />
                  <Label htmlFor={`bulk-${r.value}`} className="text-sm font-normal cursor-pointer">
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
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? "Submitting..." : `Report ${selectedCount} ${selectedCount === 1 ? "listing" : "listings"}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}