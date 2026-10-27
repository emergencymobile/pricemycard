import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, Package, Heart, MapPin, ShoppingBag, Settings, LogOut, Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setName(u.full_name || ""); setAvatar(u.profile_image || ""); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const uploadAvatar = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatar(file_url);
      await base44.auth.updateMe({ profile_image: file_url });
      toast({ title: "Photo updated!" });
    } catch {}
    setUploading(false);
  };

  const saveProfile = async () => {
    await base44.auth.updateMe({ display_name: name });
    setEditing(false);
    toast({ title: "Profile saved!" });
  };

  const logout = async () => {
    await base44.auth.logout("/");
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await base44.functions.invoke("deleteMyAccount");
      await base44.auth.logout("/");
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      toast({ title: "Could not delete account. Please try again." });
    }
  };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const menuItems = [
    { icon: ShoppingBag, label: "My Orders", path: "/orders" },
    { icon: Package, label: "Seller Dashboard", path: "/dashboard" },
    { icon: Heart, label: "Favorites", path: "/favorites" },
    { icon: MapPin, label: "Addresses", path: "/addresses" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (user?.full_name || "U")[0]}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer shadow-lg">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} />
          </label>
        </div>
        {editing ? (
          <div className="flex gap-2 max-w-xs mx-auto">
            <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
            <Button className="bg-emerald-600 text-white rounded-xl" onClick={saveProfile}>Save</Button>
          </div>
        ) : (
          <>
            <h1 className="font-display font-bold text-xl">{user?.full_name || "User"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Button variant="ghost" size="sm" className="text-emerald-600 mt-1" onClick={() => setEditing(true)}>Edit Profile</Button>
          </>
        )}
      </div>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map(m => (
          <Link key={m.path} to={m.path}>
            <div className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-secondary transition-colors cursor-pointer">
              <m.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium flex-1">{m.label}</span>
              <span className="text-muted-foreground">→</span>
            </div>
          </Link>
        ))}
        <button onClick={logout} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-red-50 transition-colors text-red-600">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors text-red-600 mt-4"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-sm font-medium">Delete Account</span>
          </button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and signs you out. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={deleteAccount}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleting ? "Deleting…" : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}