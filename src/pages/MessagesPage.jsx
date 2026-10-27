import React, { useState, useEffect, useRef } from "react";
import { Send, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const allMsgs = await base44.entities.Message.filter({ sender_id: u.id }, "-created_date", 50);
        const received = await base44.entities.Message.filter({ receiver_id: u.id }, "-created_date", 50);
        const all = [...allMsgs, ...received];
        const convMap = {};
        all.forEach(m => {
          if (!convMap[m.conversation_id]) convMap[m.conversation_id] = { id: m.conversation_id, lastMsg: m, messages: [] };
          convMap[m.conversation_id].messages.push(m);
          if (new Date(m.created_date) > new Date(convMap[m.conversation_id].lastMsg.created_date)) convMap[m.conversation_id].lastMsg = m;
        });
        const convList = Object.values(convMap).sort((a, b) => new Date(b.lastMsg.created_date) - new Date(a.lastMsg.created_date));
        setConversations(convList);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const openConv = (conv) => {
    setActiveConv(conv);
    const sorted = [...conv.messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setMessages(sorted);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || !user) return;
    setSending(true);
    const receiverId = activeConv.id.split("_").find(id => id !== user.id);
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: activeConv.id, sender_id: user.id, receiver_id: receiverId, text: newMsg.trim()
      });
      setMessages(prev => [...prev, msg]);
      setNewMsg("");
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {}
    setSending(false);
  };

  const sendImage = async (file) => {
    if (!activeConv || !user) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const receiverId = activeConv.id.split("_").find(id => id !== user.id);
      const msg = await base44.entities.Message.create({
        conversation_id: activeConv.id, sender_id: user.id, receiver_id: receiverId, text: "📷 Image", image_url: file_url
      });
      setMessages(prev => [...prev, msg]);
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-display font-bold text-2xl mb-6">Messages</h1>
      <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className="bg-secondary rounded-xl overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No conversations yet</p>
          ) : conversations.map(conv => (
            <button key={conv.id} onClick={() => openConv(conv)}
              className={`w-full text-left p-4 border-b border-border/50 hover:bg-accent/50 transition-colors ${activeConv?.id === conv.id ? "bg-accent" : ""}`}>
              <p className="font-medium text-sm truncate">{conv.lastMsg.listing_title || "Direct Message"}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">{conv.lastMsg.text}</p>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2 flex flex-col bg-secondary rounded-xl">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div>
          ) : (
            <>
              <div className="p-4 border-b border-border/50">
                <p className="font-medium text-sm">{activeConv.lastMsg.listing_title || "Conversation"}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${m.sender_id === user.id ? "bg-emerald-600 text-white" : "bg-muted"}`}>
                      {m.image_url && <img src={m.image_url} alt="" className="rounded-lg mb-2 max-w-full" />}
                      <p className="text-sm">{m.text}</p>
                      <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? "text-emerald-200" : "text-muted-foreground"}`}>
                        {new Date(m.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-border/50 flex gap-2">
                <label className="shrink-0">
                  <Button variant="ghost" size="icon" className="rounded-xl" asChild><span><ImagePlus className="w-5 h-5" /></span></Button>
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && sendImage(e.target.files[0])} />
                </label>
                <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." className="rounded-xl"
                  onKeyDown={e => e.key === "Enter" && sendMessage()} />
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" onClick={sendMessage} disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}