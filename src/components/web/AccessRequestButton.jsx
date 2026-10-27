import React, { useState, useEffect } from "react";
import { MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// "Request free access" link shown on the paywall. Opens a dialog where the
// user writes a note to the owner. Works for both logged-in users and guests —
// guests are asked for their email so the owner can follow up. Anti-spam is
// enforced server-side (one pending request per user or email). Device type
// is detected and sent automatically.
export default function AccessRequestButton() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.isAuthenticated().catch(() => false).then((authed) => {
      setIsGuest(!authed);
    });
  }, []);

  const handleSubmit = async () => {
    if (note.trim().length < 10) {
      toast({ title: "Please write at least 10 characters", variant: "destructive" });
      return;
    }
    if (isGuest && !email.trim()) {
      toast({ title: "Please enter your email address", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitAccessRequest", { note, email: email.trim() });
      if (res.data?.error) {
        toast({ title: res.data.error, variant: "destructive" });
      } else {
        setSubmitted(true);
        toast({ title: "Request sent!", description: "The owner will review your request." });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || "Could not submit request. Please try again.";
      toast({ title: msg, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setOpen(false);
    if (submitted) {
      setSubmitted(false);
      setNote("");
      setEmail("");
    }
  };

  if (submitted) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 className="w-4 h-4" />
        <span>Request sent. The owner will review it shortly.</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm text-muted-foreground hover:text-emerald-400 underline underline-offset-4 transition-colors"
      >
        Can't pay? Request free access from the owner
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Free Access</DialogTitle>
            <DialogDescription>
              Write a short note to the owner explaining why you'd like free access. Your device type will be included automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {isGuest && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">So the owner can follow up with you.</p>
              </div>
            )}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. I'm a student and can't afford the subscription right now, but I'd love to use the search for my card collection..."
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{note.length}/1000</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmit}
              disabled={submitting || note.trim().length < 10 || (isGuest && !email.trim())}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}