import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { analyzeCardImage, categoryForItemType } from "@/lib/autoNameListing";
import { verifyListingImage } from "@/lib/verifyListingImage";

const CONDITIONS = ["Mint", "Near Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"];
const CATEGORIES = ["Singles", "Lots", "Boxes", "Packs", "Cases", "Memorabilia"];

export default function SellPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [namingLoading, setNamingLoading] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { relevant, summary, mismatches }
  const [form, setForm] = useState({
    title: "", player_name: "", team: "", nationality: "", season: "", competition: "",
    manufacturer: "", card_set: "", card_number: "", parallel: "", variation: "",
    is_autograph: false, is_patch: false, is_rookie: false, is_limited_edition: false,
    serial_number: "", condition: "Near Mint",
    description: "", price: "", shipping_cost: "0", international_shipping: false,
    offers_allowed: false, is_auction: false, quantity: "1", category: "Singles",
  });

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setVerifyResult(null); };

  const uploadImages = async (files) => {
    setUploading(true);
    setVerifyResult(null);
    const urls = [];
    const wasEmpty = images.length === 0;
    for (const file of Array.from(files).slice(0, 10 - images.length)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      } catch {}
    }
    setImages(prev => [...prev, ...urls]);
    setUploading(false);

    // Auto-name from the first uploaded photo.
    if (wasEmpty && urls[0]) {
      setNamingLoading(true);
      try {
        const data = await analyzeCardImage(urls[0]);
        const cat = categoryForItemType(data.item_type);
        if (data.confident && data.title) {
          setForm(f => ({
            ...f,
            title: f.title || data.title,
            player_name: f.player_name || data.player_name,
            team: f.team || data.team,
            manufacturer: f.manufacturer || data.manufacturer,
            card_set: f.card_set || data.card_set,
            parallel: f.parallel || data.parallel,
            serial_number: f.serial_number || data.serial_number,
            is_autograph: f.is_autograph || data.is_autograph,
            is_patch: f.is_patch || data.is_patch,
            is_rookie: f.is_rookie || data.is_rookie,
            category: cat && f.category === "Singles" ? cat : f.category,
          }));
          setNeedsReview(false);
          toast({ title: "Listing auto-named from photo", description: data.title });
        } else {
          setNeedsReview(true);
          toast({ title: "Couldn't read the card", description: "Enter the name manually — it'll be flagged for review.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Auto-naming failed", description: "Enter the name manually.", variant: "destructive" });
      } finally {
        setNamingLoading(false);
      }
    }
  };

  const removeImage = (i) => { setImages(prev => prev.filter((_, idx) => idx !== i)); setVerifyResult(null); };

  const aiAssist = async () => {
    if (!form.player_name && !form.title) { toast({ title: "Enter a player name or title first" }); return; }
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke("aiAssistListing", {
        player_name: form.player_name || "",
        title: form.title || "",
        team: form.team || "",
        condition: form.condition || "",
      });
      const data = res.data;
      if (data.description) set("description", data.description);
      if (data.suggested_title && !form.title) set("title", data.suggested_title);
      if (data.suggested_price && !form.price) set("price", String(data.suggested_price));
      toast({ title: "AI suggestions applied!" });
    } catch { toast({ title: "AI assist failed", variant: "destructive" }); }
    setAiLoading(false);
  };

  const save = async (status) => {
    const needsPlayer = form.category === "Singles";
    if (!form.title || !form.price || (needsPlayer && !form.player_name)) {
      toast({ title: needsPlayer ? "Please fill in title, player name, and price" : "Please fill in title and price", variant: "destructive" }); return;
    }
    // Before publishing (not drafting), verify the entered details actually
    // match the submitted photo. A mismatch blocks the listing from going live.
    if (status === "active" && images.length > 0) {
      setVerifying(true);
      setVerifyResult(null);
      let r;
      try {
        r = await verifyListingImage(images[0], form);
      } catch {
        r = { relevant: true, summary: "Verification skipped — AI unavailable. Please double-check your details.", mismatches: [] };
      } finally {
        setVerifying(false);
      }
      setVerifyResult(r);
      if (!r.relevant) {
        toast({ title: "Can't publish — details don't match photo", description: r.summary, variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.Listing.create({
        ...form,
        price: Number(form.price),
        shipping_cost: Number(form.shipping_cost),
        quantity: Number(form.quantity),
        images,
        status,
        needs_review: needsReview && !form.title,
        seller_name: "PriceMyCard",
      });
      toast({ title: status === "active" ? "Listing published!" : "Draft saved!" });
      navigate("/dashboard");
    } catch { toast({ title: "Could not save listing", variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl mb-2">Create Listing</h1>
      <p className="text-sm text-muted-foreground mb-8">List your soccer card for sale</p>

      <div className="space-y-8">
        {/* Images */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Photos (up to 10)</Label>
            {namingLoading && <span className="text-xs text-emerald-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Naming from photo…</span>}
            {needsReview && !namingLoading && <span className="text-xs text-amber-400">Flagged for manual naming</span>}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-secondary">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-emerald-500 transition-colors cursor-pointer flex flex-col items-center justify-center">
                {uploading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground mt-1">Add Photo</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => uploadImages(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Card title" className="rounded-xl" /></div>
            <div><Label className="text-xs mb-1.5 block">Player Name *</Label><Input value={form.player_name} onChange={e => set("player_name", e.target.value)} placeholder="Player name" className="rounded-xl" /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label className="text-xs mb-1.5 block">Team</Label><Input value={form.team} onChange={e => set("team", e.target.value)} placeholder="Team" className="rounded-xl" /></div>
            <div><Label className="text-xs mb-1.5 block">Nationality</Label><Input value={form.nationality} onChange={e => set("nationality", e.target.value)} placeholder="Country" className="rounded-xl" /></div>
            <div><Label className="text-xs mb-1.5 block">Season</Label><Input value={form.season} onChange={e => set("season", e.target.value)} placeholder="e.g. 2025/26" className="rounded-xl" /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label className="text-xs mb-1.5 block">Competition</Label><Input value={form.competition} onChange={e => set("competition", e.target.value)} placeholder="e.g. Champions League" className="rounded-xl" /></div>
            <div><Label className="text-xs mb-1.5 block">Manufacturer</Label><Input value={form.manufacturer} onChange={e => set("manufacturer", e.target.value)} placeholder="e.g. Topps, Panini" className="rounded-xl" /></div>
            <div><Label className="text-xs mb-1.5 block">Card Set</Label><Input value={form.card_set} onChange={e => set("card_set", e.target.value)} placeholder="Card set name" className="rounded-xl" /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label className="text-xs mb-1.5 block">Card Number</Label><Input value={form.card_number} onChange={e => set("card_number", e.target.value)} placeholder="#" className="rounded-xl" /></div>
            <div><Label className="text-xs mb-1.5 block">Parallel</Label><Input value={form.parallel} onChange={e => set("parallel", e.target.value)} placeholder="e.g. Gold, Refractor" className="rounded-xl" /></div>
            <div><Label className="text-xs mb-1.5 block">Variation</Label><Input value={form.variation} onChange={e => set("variation", e.target.value)} className="rounded-xl" /></div>
          </div>
          <div><Label className="text-xs mb-1.5 block">Serial Number</Label><Input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} placeholder="e.g. /99" className="rounded-xl" /></div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: "is_autograph", label: "Autograph" },
            { key: "is_patch", label: "Patch" },
            { key: "is_rookie", label: "Rookie Card" },
            { key: "is_limited_edition", label: "Limited Edition" },
          ].map(t => (
            <div key={t.key} className="flex items-center gap-2">
              <Switch checked={form[t.key]} onCheckedChange={v => set(t.key, v)} />
              <Label className="text-sm">{t.label}</Label>
            </div>
          ))}
        </div>

        {/* Condition */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">Condition</Label>
            <Select value={form.condition} onValueChange={v => set("condition", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Category */}
        <div>
          <Label className="text-xs mb-1.5 block">Category</Label>
          <Select value={form.category} onValueChange={v => set("category", v)}>
            <SelectTrigger className="rounded-xl w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Description with AI */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs">Description</Label>
            <Button variant="ghost" size="sm" className="text-emerald-600 gap-1 text-xs" onClick={aiAssist} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Assist
            </Button>
          </div>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe your card..." className="min-h-[120px] rounded-xl" />
        </div>

        {/* Pricing & Shipping */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label className="text-xs mb-1.5 block">Price (AED) *</Label><Input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0.00" className="rounded-xl" /></div>
          <div><Label className="text-xs mb-1.5 block">Shipping Cost (AED)</Label><Input type="number" value={form.shipping_cost} onChange={e => set("shipping_cost", e.target.value)} className="rounded-xl" /></div>
          <div><Label className="text-xs mb-1.5 block">Quantity</Label><Input type="number" value={form.quantity} onChange={e => set("quantity", e.target.value)} className="rounded-xl" /></div>
        </div>

        {/* More Toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2"><Switch checked={form.offers_allowed} onCheckedChange={v => set("offers_allowed", v)} /><Label className="text-sm">Allow Offers</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_auction} onCheckedChange={v => set("is_auction", v)} /><Label className="text-sm">Auction</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.international_shipping} onCheckedChange={v => set("international_shipping", v)} /><Label className="text-sm">International Shipping</Label></div>
        </div>

        {/* AI photo verification result */}
        {verifyResult && !verifyResult.relevant && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Photo doesn't match the details
            </p>
            <p className="text-sm text-muted-foreground mb-2">{verifyResult.summary}</p>
            {verifyResult.mismatches.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 mb-2">
                {verifyResult.mismatches.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Edit your details to match the photo, then publish again.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" className="rounded-xl" onClick={() => save("draft")} disabled={saving || verifying}>Save Draft</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex-1" onClick={() => save("active")} disabled={saving || verifying}>
            {(saving || verifying) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {verifying ? "Verifying photo…" : "Publish Listing"}
          </Button>
        </div>
      </div>
    </div>
  );
}