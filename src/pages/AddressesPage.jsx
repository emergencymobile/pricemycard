import React, { useState, useEffect } from "react";
import { MapPin, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", full_name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "", phone: "", is_default: false });
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        const a = await base44.entities.Address.filter({ user_id: u.id });
        setAddresses(a);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    if (!form.full_name || !form.line1 || !form.city || !form.country) { toast({ title: "Please fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const u = await base44.auth.me();
      const a = await base44.entities.Address.create({ ...form, user_id: u.id });
      setAddresses(prev => [...prev, a]);
      setShowForm(false);
      setForm({ label: "", full_name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "", phone: "", is_default: false });
      toast({ title: "Address saved!" });
    } catch {}
    setSaving(false);
  };

  const deleteAddr = async (id) => {
    await base44.entities.Address.delete(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-2xl">Addresses</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {showForm && (
        <div className="bg-secondary rounded-xl p-6 mb-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1 block">Label</Label><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Home" className="rounded-lg" /></div>
            <div><Label className="text-xs mb-1 block">Full Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} autoComplete="name" className="rounded-lg" /></div>
          </div>
          <div><Label className="text-xs mb-1 block">Address Line 1 *</Label><Input value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))} autoComplete="address-line1" className="rounded-lg" /></div>
          <div><Label className="text-xs mb-1 block">Address Line 2</Label><Input value={form.line2} onChange={e => setForm(f => ({ ...f, line2: e.target.value }))} autoComplete="address-line2" className="rounded-lg" /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label className="text-xs mb-1 block">City *</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} autoComplete="address-level2" className="rounded-lg" /></div>
            <div><Label className="text-xs mb-1 block">State</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} autoComplete="address-level1" className="rounded-lg" /></div>
            <div><Label className="text-xs mb-1 block">Postal Code</Label><Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} autoComplete="postal-code" className="rounded-lg" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1 block">Country *</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} autoComplete="country-name" className="rounded-lg" /></div>
            <div><Label className="text-xs mb-1 block">Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} autoComplete="tel" className="rounded-lg" /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} /><Label className="text-sm">Default address</Label></div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Address
          </Button>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-2">No addresses saved</p>
          <p className="text-sm text-muted-foreground">Add an address for faster checkout</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(a => (
            <div key={a.id} className="bg-secondary rounded-xl p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{a.label || "Address"}</p>
                  {a.is_default && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Default</span>}
                </div>
                <p className="text-xs text-muted-foreground">{a.full_name}</p>
                <p className="text-xs text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                <p className="text-xs text-muted-foreground">{a.city}, {a.state} {a.postal_code}</p>
                <p className="text-xs text-muted-foreground">{a.country}</p>
              </div>
              <button onClick={() => deleteAddr(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}