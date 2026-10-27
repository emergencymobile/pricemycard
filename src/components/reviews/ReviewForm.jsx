import React, { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
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

export default function ReviewForm({ order, open, onOpenChange, onSubmitted }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [buyer, setBuyer] = useState(null);

  useEffect(() => {
    if (open) {
      base44.auth.me().then(setBuyer).catch(() => {});
      setRating(0);
      setHover(0);
      setTitle("");
      setComment("");
    }
  }, [open]);

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Review.create({
        listing_id: order.listing_id,
        seller_id: order.seller_id,
        order_id: order.id,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        buyer_name: buyer?.full_name || "Buyer",
        buyer_avatar: buyer?.profile_image || "",
      });
      toast({ title: "Review submitted — thank you!" });
      onSubmitted?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Could not submit review", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Review your purchase</DialogTitle>
          <DialogDescription>
            How was your experience with this seller? Your feedback helps other buyers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      (hover || rating) >= n
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Title (optional)</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="rounded-xl"
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Comment (optional)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about the card condition, shipping speed, seller communication..."
              className="min-h-[80px] rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="rounded-xl" disabled={submitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" disabled={submitting} onClick={submit}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}