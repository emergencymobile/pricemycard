import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, Share2, ShoppingCart, MessageSquare, Flag, ChevronLeft, ChevronRight, Star, Zap, Shield, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import CardTile from "@/components/cards/CardTile";
import ListingPriceChart from "@/components/cards/ListingPriceChart";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { maskName } from "@/lib/maskName";
import { useCurrency } from "@/lib/currency";

export default function ListingDetail() {
  const { formatFromAED } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [liked, setLiked] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [question, setQuestion] = useState("");
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const l = await base44.entities.Listing.get(id);
        setListing(l);
        try { const u = await base44.auth.me(); setUser(u); } catch {}
        const rev = await base44.entities.Review.filter({ listing_id: id });
        setReviews(rev);
        if (l.player_name) {
          const rel = await base44.entities.Listing.filter({ status: "active" }, "-created_date", 10);
          setRelated(rel.filter((r) => r.id !== id).slice(0, 5));
        }
        // Price history: record today's snapshot (authentic price via backend)
        // and load the full trend for the chart.
        try {
          const res = await base44.functions.invoke("recordListingPrice", { listing_id: id });
          setPriceHistory(res?.data?.history || []);
        } catch {}
      } catch {navigate("/");}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;
  if (!listing) return null;

  const images = listing.images?.length ? listing.images : ["https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"];
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const canEdit = user?.role === "admin" || (user?.id && user.id === listing.created_by_id);

  const buildDraft = (l) => ({
    title: l.title || "",
    player_name: l.player_name || "",
    team: l.team || "",
    nationality: l.nationality || "",
    season: l.season || "",
    competition: l.competition || "",
    manufacturer: l.manufacturer || "",
    card_set: l.card_set || "",
    card_number: l.card_number || "",
    parallel: l.parallel || "",
    variation: l.variation || "",
    condition: l.condition || "",
    serial_number: l.serial_number || "",
    price: l.price ?? "",
    shipping_cost: l.shipping_cost ?? 0,
    description: l.description || "",
  });

  const saveDetails = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Listing.update(id, {
        nationality: draft.nationality,
        season: draft.season,
        competition: draft.competition,
        manufacturer: draft.manufacturer,
        card_set: draft.card_set,
        card_number: draft.card_number,
        parallel: draft.parallel,
        variation: draft.variation,
        condition: draft.condition,
        serial_number: draft.serial_number,
        needs_review: false,
      });
      setListing({ ...listing, ...updated });
      setEditingDetails(false);
      toast({ title: "Details updated" });
    } catch {
      toast({ title: "Could not save", variant: "destructive" });
    }
    setSaving(false);
  };

  const addToCart = async () => {
    try {
      const user = await base44.auth.me();
      await base44.entities.CartItem.create({
        user_id: user.id, listing_id: listing.id, quantity: 1,
        listing_title: listing.title, listing_image: images[0], listing_price: listing.price,
        seller_id: listing.created_by_id, shipping_cost: listing.shipping_cost || 0
      });
      toast({ title: "Added to cart!" });
    } catch {toast({ title: "Please log in first", variant: "destructive" });}
  };

  const submitOffer = async () => {
    try {
      const user = await base44.auth.me();
      await base44.entities.Offer.create({
        listing_id: listing.id, buyer_id: user.id, seller_id: listing.created_by_id,
        amount: Number(offerAmount), listing_title: listing.title, listing_image: images[0]
      });
      toast({ title: "Offer sent!" });
      setShowOffer(false);
      setOfferAmount("");
    } catch {toast({ title: "Could not send offer", variant: "destructive" });}
  };

  const toggleFav = async () => {
    const prev = liked;
    setLiked(!liked);
    try {
      const user = await base44.auth.me();
      if (!prev) await base44.entities.Favorite.create({ listing_id: listing.id, user_id: user.id });else
      {
        const favs = await base44.entities.Favorite.filter({ listing_id: listing.id, user_id: user.id });
        if (favs.length) await base44.entities.Favorite.delete(favs[0].id);
      }
    } catch {
      // Rollback the optimistic update if the API call failed.
      setLiked(prev);
    }
  };

  const sendQuestion = async () => {
    if (!question.trim()) return;
    try {
      const user = await base44.auth.me();
      const convId = [user.id, listing.created_by_id].sort().join("_");
      await base44.entities.Message.create({
        conversation_id: convId, sender_id: user.id, receiver_id: listing.created_by_id,
        text: question, listing_id: listing.id, listing_title: listing.title
      });
      toast({ title: "Message sent!" });
      setQuestion("");
    } catch {toast({ title: "Please log in first", variant: "destructive" });}
  };

  const details = [
  { label: "Player", key: "player_name", val: listing.player_name },
  { label: "Team", key: "team", val: listing.team },
  { label: "Nationality", key: "nationality", val: listing.nationality },
  { label: "Season", key: "season", val: listing.season },
  { label: "Competition", key: "competition", val: listing.competition },
  { label: "Manufacturer", key: "manufacturer", val: listing.manufacturer },
  { label: "Card Set", key: "card_set", val: listing.card_set },
  { label: "Card Number", key: "card_number", val: listing.card_number },
  { label: "Parallel", key: "parallel", val: listing.parallel },
  { label: "Variation", key: "variation", val: listing.variation },
  { label: "Condition", key: "condition", val: listing.condition, enum: ["Mint","Near Mint","Excellent","Very Good","Good","Fair","Poor"] },
  { label: "Serial Number", key: "serial_number", val: listing.serial_number }];

  const editDetails = details.filter((d) => d.key !== "player_name" && d.key !== "team");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div>
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary mb-3">
            <Image src={images[currentImg]} fittingType="fill" className="w-full h-full" />
            {images.length > 1 &&
            <>
                <button onClick={() => setCurrentImg((i) => Math.max(0, i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 flex items-center justify-center shadow-lg hover:bg-background/80 transition">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentImg((i) => Math.min(images.length - 1, i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 flex items-center justify-center shadow-lg hover:bg-background/80 transition">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            }
          </div>
          {images.length > 1 &&
          <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) =>
            <button
              key={i}
              onClick={() => setCurrentImg(i)}
              className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
              currentImg === i ? "border-emerald-500" : "border-transparent"}`
              }>
              
                  <Image src={img} fittingType="fill" className="h-full w-full" />
                </button>
            )}
            </div>
          }
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {listing.is_rookie && <Badge className="bg-emerald-100 text-emerald-700">Rookie Card</Badge>}
              {listing.is_autograph && <Badge className="bg-yellow-100 text-yellow-700">Autograph</Badge>}
              {listing.is_patch && <Badge className="bg-purple-100 text-purple-700">Patch</Badge>}
              {listing.is_limited_edition && <Badge className="bg-red-100 text-red-700">Limited Edition</Badge>}
              </div>
            {editing ? (
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full font-display font-bold text-2xl md:text-3xl bg-secondary rounded-xl px-3 py-2 outline-none border border-border/60 focus:border-emerald-500"
              />
            ) : (
              <div className="flex items-start gap-2">
                <h1 className="font-display font-bold text-2xl md:text-3xl">{canEdit ? listing.title : maskName(listing.title)}</h1>
                {canEdit && (
                  <button
                    onClick={() => { setDraft(buildDraft(listing)); setEditing(true); }}
                    className="mt-1 text-muted-foreground hover:text-emerald-600 transition"
                    title="Edit listing text"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {editing ? (
              <div className="flex gap-2 mt-2">
                <input
                  value={draft.player_name}
                  onChange={(e) => setDraft({ ...draft, player_name: e.target.value })}
                  placeholder="Player name"
                  className="flex-1 px-3 py-2 bg-secondary rounded-xl text-sm border border-border/60 focus:border-emerald-500 outline-none"
                />
                <input
                  value={draft.team}
                  onChange={(e) => setDraft({ ...draft, team: e.target.value })}
                  placeholder="Team"
                  className="flex-1 px-3 py-2 bg-secondary rounded-xl text-sm border border-border/60 focus:border-emerald-500 outline-none"
                />
              </div>
            ) : (
              <p className="text-muted-foreground mt-1">{canEdit ? `${listing.player_name} · ${listing.team}` : `${maskName(listing.player_name)} · ${maskName(listing.team)}`}</p>
            )}
            {editing && (
              <div className="flex gap-2 mt-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const updated = await base44.entities.Listing.update(id, {
                        title: draft.title,
                        player_name: draft.player_name,
                        team: draft.team,
                        nationality: draft.nationality,
                        season: draft.season,
                        competition: draft.competition,
                        manufacturer: draft.manufacturer,
                        card_set: draft.card_set,
                        card_number: draft.card_number,
                        parallel: draft.parallel,
                        variation: draft.variation,
                        condition: draft.condition,
                        serial_number: draft.serial_number,
                        price: Number(draft.price),
                        shipping_cost: Number(draft.shipping_cost) || 0,
                        description: draft.description,
                        needs_review: false,
                      });
                      setListing({ ...listing, ...updated });
                      setEditing(false);
                      toast({ title: "Listing updated" });
                    } catch {
                      toast({ title: "Could not save", variant: "destructive" });
                    }
                    setSaving(false);
                  }}
                >
                  Save
                </Button>
                <Button variant="ghost" className="rounded-xl" disabled={saving} onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">Price</span>
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  className="w-32 px-3 py-2 bg-secondary rounded-xl text-2xl font-display font-bold text-emerald-600 border border-border/60 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">Shipping</span>
                <input
                  type="number"
                  value={draft.shipping_cost}
                  onChange={(e) => setDraft({ ...draft, shipping_cost: e.target.value })}
                  className="w-28 px-3 py-2 bg-secondary rounded-xl text-sm border border-border/60 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <span className="font-display font-bold text-3xl text-emerald-600">{formatFromAED(listing.price)}</span>
              {listing.shipping_cost > 0 && <span className="text-sm text-muted-foreground">+ {formatFromAED(listing.shipping_cost)} shipping</span>}
              {listing.shipping_cost === 0 && <span className="text-sm text-emerald-600 font-medium">Free shipping</span>}
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base" onClick={addToCart}>
              <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
            </Button>
            <Button variant="outline" className="rounded-xl h-12" onClick={toggleFav}>
              <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="outline" className="rounded-xl h-12" onClick={() => navigator.share?.({ title: listing.title, url: window.location.href }).catch(() => {})}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {listing.offers_allowed &&
          <div>
              {!showOffer ?
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowOffer(true)}>Make an Offer</Button> :

            <div className="flex gap-2">
                  <input type="number" placeholder="Your offer" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}
              className="flex-1 px-4 py-2 bg-secondary rounded-xl text-sm" />
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" onClick={submitOffer}>Send</Button>
                  <Button variant="ghost" className="rounded-xl" onClick={() => setShowOffer(false)}>Cancel</Button>
                </div>
            }
            </div>
          }

          {/* Seller */}
          <div className="bg-secondary rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                {maskName(listing.seller_name || "S")[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{listing.seller_name || "Seller"}</p>
                {avgRating && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {avgRating} ({reviews.length})</div>}
              </div>
            </div>
            <Link to={`/messages`}>
              <Button variant="ghost" size="sm" className="rounded-lg gap-1">
                <MessageSquare className="w-4 h-4" /> Contact
              </Button>
            </Link>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-sm">Card Details</h3>
              {canEdit && !editingDetails && (
                <button
                  onClick={() => { setDraft(buildDraft(listing)); setEditingDetails(true); }}
                  className="text-muted-foreground hover:text-emerald-600 transition"
                  title="Edit card details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editingDetails ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {editDetails.map((d) =>
                    <div key={d.label} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{d.label}</span>
                      {d.enum ? (
                        <Select value={draft[d.key] || ""} onValueChange={(v) => setDraft({ ...draft, [d.key]: v })}>
                          <SelectTrigger className="h-9 rounded-xl bg-secondary text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {d.enum.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <input
                          value={draft[d.key] || ""}
                          onChange={(e) => setDraft({ ...draft, [d.key]: e.target.value })}
                          placeholder={d.label}
                          className="px-3 py-2 bg-secondary rounded-xl text-sm border border-border/60 focus:border-emerald-500 outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" disabled={saving} onClick={saveDetails}>Save</Button>
                  <Button variant="ghost" className="rounded-xl" disabled={saving} onClick={() => setEditingDetails(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {details.filter((d) => d.val).map((d) =>
                  <div key={d.label} className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">{d.label}</span>
                    <span className="text-xs font-medium text-right">{canEdit ? d.val : maskName(d.val)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <ListingPriceChart data={priceHistory} />

          {editing ? (
            <div>
              <h3 className="font-semibold text-sm mb-2">Description</h3>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Description"
                className="min-h-[100px] rounded-xl text-sm"
              />
            </div>
          ) : (listing.description &&
            <div>
              <h3 className="font-semibold text-sm mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {/* Question */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Ask a Question</h3>
            <div className="flex gap-2">
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask the seller..." className="min-h-[60px] rounded-xl text-sm" />
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0" onClick={sendQuestion}>Send</Button>
            </div>
          </div>

          {/* Trust */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-emerald-600" /> Buyer Protection</div>
            <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-emerald-600" /> Secure Checkout</div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 &&
      <section className="mt-12">
          <h2 className="font-display font-bold text-xl mb-6">Reviews ({reviews.length})</h2>
          <div className="space-y-4">
            {reviews.map((r) =>
          <div key={r.id} className="bg-secondary rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div>
                  <span className="text-xs text-muted-foreground">{r.buyer_name}</span>
                </div>
                {r.title && <p className="font-medium text-sm">{r.title}</p>}
                {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
              </div>
          )}
          </div>
        </section>
      }

      {/* Related */}
      {related.length > 0 &&
      <section className="mt-12">
          <h2 className="font-display font-bold text-xl mb-6">Related Cards</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {related.map((l) => <CardTile key={l.id} listing={l} />)}
          </div>
        </section>
      }
    </div>);

}