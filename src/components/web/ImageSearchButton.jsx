import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { analyzeCardImage } from "@/lib/autoNameListing";

// Builds a concise eBay search query from the AI-detected card fields.
// Prioritizes player name + manufacturer for the best match without
// over-constraining (eBay AND-matches every keyword token).
function buildSearchQuery(d) {
  const parts = [d.player_name];
  if (d.manufacturer) parts.push(d.manufacturer);
  return parts.filter(Boolean).join(" ").trim();
}

export default function ImageSearchButton({ disabled, onResult }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      toast({ title: "Unsupported file", description: "Please use JPG, PNG, or WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please keep it under 5MB.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      // Upload the photo so the AI can analyze it.
      const up = await base44.integrations.Core.UploadPublicFile({ file });
      const file_url = up.file_url;
      if (!file_url) throw new Error("No file URL returned");

      // Identify the card via vision AI.
      const data = await analyzeCardImage(file_url);
      const query = buildSearchQuery(data);

      if (!query || !data.confident) {
        toast({
          title: "Couldn't identify the card",
          description: "Try a clearer photo with the player name visible.",
          variant: "destructive",
        });
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      onResult(query);
    } catch (e) {
      toast({ title: "Image search failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-xl bg-card border-border shrink-0"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        title="Search by photo"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}