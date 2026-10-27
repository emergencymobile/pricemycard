import React, { useState, useEffect } from "react";
import { Bell, MessageSquare, DollarSign, Package, UserPlus, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const ICONS = { message: MessageSquare, offer: DollarSign, offer_accepted: Check, item_sold: Package, item_shipped: Package, new_follower: UserPlus, review: Star, system: Bell };
const COLORS = { message: "bg-blue-100 text-blue-600", offer: "bg-yellow-100 text-yellow-600", offer_accepted: "bg-emerald-100 text-emerald-600", item_sold: "bg-emerald-100 text-emerald-600", item_shipped: "bg-purple-100 text-purple-600", new_follower: "bg-pink-100 text-pink-600", review: "bg-orange-100 text-orange-600", system: "bg-gray-100 text-gray-600" };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        const n = await base44.entities.Notification.filter({ user_id: u.id }, "-created_date", 50);
        setNotifications(n);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) await base44.entities.Notification.update(n.id, { is_read: true });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-2xl">Notifications</h1>
        {unreadCount > 0 && <Button variant="ghost" size="sm" className="text-emerald-600" onClick={markAllRead}>Mark all read</Button>}
      </div>
      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-2">No notifications</p>
          <p className="text-sm text-muted-foreground">We'll let you know when something happens</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div key={n.id} className={`flex gap-3 p-4 rounded-xl transition-colors ${n.is_read ? "bg-secondary/50" : "bg-secondary"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${COLORS[n.type] || COLORS.system}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? "" : "font-medium"}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_date).toLocaleDateString()}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}