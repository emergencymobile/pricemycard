import React, { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { analyzeCardImage, categoryForItemType } from "@/lib/autoNameListing";

/**
 * Admin/owner temporary tool: uploads an image and attaches it to a listing
 * that has no image yet. Rendered as a native <label> overlay (sibling of the
 * card's <Link>, not nested inside it) so the browser's built-in
 * label→input forwarding opens the file picker reliably — no programmatic
 * click that the surrounding anchor could swallow.
 */
export default function AddPictureButton({ listing, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
    setUploading(true);
    let file_url;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      file_url = res.file_url;
      if (!file_url) throw new Error("No file URL returned");
      await base44.entities.Listing.update(listing.id, { images: [file_url] });
      onUploaded?.(file_url);
    } catch (e) {
      toast({ title: "Upload failed", description: e?.message || "Please try again.", variant: "destructive" });
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(false);
    // Analyze the uploaded photo and auto-name the listing.
    setAnalyzing(true);
    try {
      const data = await analyzeCardImage(file_url);
      if (data.confident && data.title) {
        const updates = {
          title: data.title,
          player_name: data.player_name,
          team: data.team,
          manufacturer: data.manufacturer,
          card_set: data.card_set,
          parallel: data.parallel,
          serial_number: data.serial_number,
          is_autograph: data.is_autograph,
          is_patch: data.is_patch,
          is_rookie: data.is_rookie,
          needs_review: false,
        };
        const cat = categoryForItemType(data.item_type);
        if (cat) updates.category = cat;
        await base44.entities.Listing.update(listing.id, updates);
        toast({ title: "Listing auto-named", description: data.title });
      } else {
        await base44.entities.Listing.update(listing.id, { needs_review: true });
        toast({ title: "Couldn't read the card", description: "Flagged for manual naming. Please edit it yourself.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Auto-naming failed", description: "You can name the listing manually.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <label className="absolute top-0 left-0 right-0 aspect-[3/4] z-30 flex items-center justify-center p-2 cursor-pointer">
      <div className="flex h-11 w-full max-w-[90%] items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-400/70 bg-amber-400/10 px-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20">
        {uploading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
        ) : analyzing ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Naming…</>
        ) : (
          <><ImagePlus className="h-3.5 w-3.5" /> Add Picture</>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </label>
  );
}