import { useState, useEffect, useRef } from "react";
import { 
  Send, Paperclip, MessageSquare, Check, CheckCheck, Smile, MoreVertical, Search, User, 
  Trash2, Image, FileText, Download, X, Circle, AlertCircle, RefreshCw
} from "lucide-react";
import { db } from "../firebase";
import { 
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, onSnapshot, addDoc, limit, getDocs, arrayUnion 
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface LiveChatSectionProps {
  currentUserId: string;
  currentUserRole: "candidate" | "consultancy" | "employer" | "admin";
  currentUserName: string;
}

interface ChatConversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantRoles: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  typingStates?: Record<string, boolean>;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  read: boolean;
  createdAt: string;
  attachment?: {
    name: string;
    type: string;
    size: string;
    url: string; // Base64 or standard asset url
  };
}

export default function LiveChatSection({
  currentUserId,
  currentUserRole,
  currentUserName
}: LiveChatSectionProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Attachment attachment state
  const [attachment, setAttachment] = useState<{ name: string; type: string; size: string; url: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 1. Fetch conversations for this user
  useEffect(() => {
    if (!currentUserId) return;

    setIsLoading(true);
    // Find chats where current user is a participant
    const q = query(
      collection(db, "chats"),
      where("participantIds", "arrayContains", currentUserId)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const chatList: ChatConversation[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        chatList.push({
          id: docSnap.id,
          participantIds: data.participantIds || [],
          participantNames: data.participantNames || {},
          participantRoles: data.participantRoles || {},
          lastMessage: data.lastMessage || "",
          lastMessageAt: data.lastMessageAt || "",
          lastMessageSenderId: data.lastMessageSenderId || "",
          typingStates: data.typingStates || {}
        });
      });

      // Sort chats by lastMessageAt descending
      chatList.sort((a, b) => {
        return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
      });

      setConversations(chatList);
      setIsLoading(false);

      // If there's an active chat, refresh it from current snapshot
      if (activeChat) {
        const updatedActive = chatList.find(c => c.id === activeChat.id);
        if (updatedActive) {
          setActiveChat(updatedActive);
        }
      }
    }, (err) => {
      console.error("Chat sync error:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // 2. Load messages for the active conversation
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snap) => {
      const msgList: ChatMessage[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        msgList.push({
          id: docSnap.id,
          chatId: d.chatId,
          senderId: d.senderId,
          senderName: d.senderName,
          senderRole: d.senderRole,
          content: d.content,
          read: d.read || false,
          createdAt: d.createdAt,
          attachment: d.attachment
        });
      });

      setMessages(msgList);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      // Mark unread messages as read (if we are the recipient)
      const unreadReceived = msgList.filter(m => m.senderId !== currentUserId && !m.read);
      if (unreadReceived.length > 0) {
        unreadReceived.forEach(async (m) => {
          try {
            await updateDoc(doc(db, "chats", activeChat.id, "messages", m.id), {
              read: true
            });
          } catch (e) {
            console.error("Failed to mark read:", e);
          }
        });

        // Also update last message status in main conversation doc if necessary
        if (activeChat.lastMessageSenderId !== currentUserId) {
          updateDoc(doc(db, "chats", activeChat.id), {
            allRead: true
          }).catch(console.error);
        }
      }
    });

    // Handle typing states listening
    const typingQuery = doc(db, "chats", activeChat.id);
    const unsubTyping = onSnapshot(typingQuery, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const tStates = data.typingStates || {};
        const activeTyping: string[] = [];
        
        Object.entries(tStates).forEach(([uid, isTypingVal]) => {
          if (uid !== currentUserId && isTypingVal === true) {
            activeTyping.push(activeChat.participantNames[uid] || "Someone");
          }
        });
        setTypingUsers(activeTyping);
      }
    });

    return () => {
      unsubscribe();
      unsubTyping();
    };
  }, [activeChat?.id, currentUserId]);

  // Handle typing state change
  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!activeChat) return;

    if (!isTyping) {
      setIsTyping(true);
      updateDoc(doc(db, "chats", activeChat.id), {
        [`typingStates.${currentUserId}`]: true
      }).catch(console.error);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeChat) {
        updateDoc(doc(db, "chats", activeChat.id), {
          [`typingStates.${currentUserId}`]: false
        }).catch(console.error);
      }
    }, 2000);
  };

  // Trigger file attachment selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`;
      
      setAttachment({
        name: file.name,
        type: file.type,
        size: sizeStr,
        url: reader.result as string
      });
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to parse local file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Dispatch Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;
    if (!newMessage.trim() && !attachment) return;

    const messageContent = newMessage.trim();
    const msgId = `msg_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const payload: ChatMessage = {
      id: msgId,
      chatId: activeChat.id,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      content: messageContent,
      read: false,
      createdAt: timestamp
    };

    if (attachment) {
      payload.attachment = attachment;
    }

    try {
      // 1. Write message to messages subcollection
      await setDoc(doc(db, "chats", activeChat.id, "messages", msgId), payload);

      // 2. Update parent chat metadata
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: attachment ? `📎 Attached ${attachment.name}` : messageContent,
        lastMessageAt: timestamp,
        lastMessageSenderId: currentUserId,
        [`typingStates.${currentUserId}`]: false
      });

      // Reset input bar
      setNewMessage("");
      setAttachment(null);
      setIsTyping(false);
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Message delivery failure.");
    }
  };

  // Create or launch a new conversation with a selected user role
  const handleInitiateNewChat = async (targetId: string, targetName: string, targetRole: string) => {
    if (!targetId || !targetName) return;
    
    // Check if conversation already exists between current user and target user
    const existing = conversations.find(c => 
      c.participantIds.includes(currentUserId) && c.participantIds.includes(targetId)
    );

    if (existing) {
      setActiveChat(existing);
      return;
    }

    // Otherwise, create a new conversation document in Firestore
    const newChatId = `chat_${currentUserId.substr(0, 5)}_${targetId.substr(0, 5)}_${Math.random().toString(36).substr(2, 5)}`;
    const timestamp = new Date().toISOString();

    const newChat: ChatConversation = {
      id: newChatId,
      participantIds: [currentUserId, targetId],
      participantNames: {
        [currentUserId]: currentUserName,
        [targetId]: targetName
      },
      participantRoles: {
        [currentUserId]: currentUserRole,
        [targetId]: targetRole
      },
      lastMessage: "Conversation initiated",
      lastMessageAt: timestamp,
      lastMessageSenderId: currentUserId,
      typingStates: {
        [currentUserId]: false,
        [targetId]: false
      }
    };

    try {
      await setDoc(doc(db, "chats", newChatId), newChat);
      setActiveChat(newChat);
    } catch (err) {
      console.error("Failed to create new chat session:", err);
      alert("Error starting chat channel.");
    }
  };

  // Fetch standard candidate, consultancy or employer directory to start new chat
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);

  const fetchDirectory = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== currentUserId) {
          list.push({
            id: docSnap.id,
            name: data.name || data.companyName || "Anonymous User",
            role: data.role || "candidate"
          });
        }
      });
      setAvailableUsers(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [currentUserId]);

  // Filter conversations matching search
  const filteredConversations = conversations.filter(c => {
    const otherParticipantId = c.participantIds.find(id => id !== currentUserId) || "";
    const name = c.participantNames[otherParticipantId] || "Recruitment Agent";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="glass rounded-3xl border border-white/5 h-[620px] flex overflow-hidden text-xs text-white" id="live-chat-workspace">
      
      {/* Sidebar List */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-black/10">
        
        {/* Search & Actions */}
        <div className="p-4 border-b border-white/5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Secure Live Chat</span>
            </h3>

            <button
              onClick={() => {
                fetchDirectory();
                setShowUsersModal(true);
              }}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all active:scale-95"
            >
              + New Chat
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-neutral-900/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white outline-none focus:border-indigo-500 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Conversations list container */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-mono text-[10px]">Syncing secure chat streams...</span>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((c) => {
              const otherId = c.participantIds.find(id => id !== currentUserId) || "";
              const otherName = c.participantNames[otherId] || "Recruitment Partner";
              const otherRole = c.participantRoles[otherId] || "Sponsor";
              const isSelected = activeChat?.id === c.id;

              // Check unread count or read boolean
              const hasUnread = c.lastMessageSenderId !== currentUserId && c.lastMessage && !isSelected;

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveChat(c)}
                  className={`w-full p-3 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected ? "bg-indigo-600/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                      <User className="w-4 h-4 text-indigo-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white truncate max-w-[130px]">{otherName}</span>
                        <span className="bg-white/5 text-gray-400 text-[8px] px-1 py-0.2 rounded uppercase font-mono">
                          {otherRole}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate max-w-[160px] mt-0.5">
                        {c.lastMessage}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {c.lastMessageAt && (
                      <span className="text-[8px] text-gray-500 block font-mono">
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {hasUnread && (
                      <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse mt-1" />
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500 italic">
              No chat histories found. Start a conversation above to launch a real-time connection.
            </div>
          )}
        </div>
      </div>

      {/* Message Screen Area */}
      <div className="flex-1 flex flex-col bg-neutral-950/20">
        {activeChat ? (
          <>
            {/* Header metadata */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                  <User className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">
                    {activeChat.participantNames[activeChat.participantIds.find(id => id !== currentUserId) || ""] || "Corporate Recruiter"}
                  </h4>
                  <p className="text-[9px] text-gray-400 flex items-center gap-1">
                    <Circle className={`w-1.5 h-1.5 ${typingUsers.length > 0 ? "fill-emerald-400 text-emerald-400" : "fill-gray-500 text-gray-500"}`} />
                    <span>{typingUsers.length > 0 ? `${typingUsers[0]} is writing...` : "Secure encrypted pipeline"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((m) => {
                const isMe = m.senderId === currentUserId;

                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-md p-3.5 rounded-2xl border ${
                      isMe 
                        ? "bg-indigo-600/10 border-indigo-500/20 text-white rounded-tr-none" 
                        : "bg-white/5 border-white/5 text-gray-200 rounded-tl-none"
                    }`}>
                      <span className="text-[8px] text-gray-400 block font-mono font-bold uppercase mb-1">
                        {isMe ? "YOU" : m.senderName} ({m.senderRole})
                      </span>
                      
                      {m.content && (
                        <p className="leading-relaxed text-xs whitespace-pre-wrap">{m.content}</p>
                      )}

                      {/* Attachment render */}
                      {m.attachment && (
                        <div className="mt-2.5 p-2 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2.5">
                          {m.attachment.type.startsWith("image/") ? (
                            <Image className="w-6 h-6 text-indigo-400 shrink-0" />
                          ) : (
                            <FileText className="w-6 h-6 text-indigo-400 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 font-mono text-[9px]">
                            <p className="text-white truncate font-bold">{m.attachment.name}</p>
                            <p className="text-gray-500 mt-0.5">{m.attachment.size}</p>
                          </div>
                          
                          <a 
                            href={m.attachment.url} 
                            download={m.attachment.name}
                            className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer"
                            title="Download attachment"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      <div className="flex justify-end items-center gap-1 mt-1.5 text-[8px] text-gray-500 font-mono">
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {isMe && (
                          m.read ? (
                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Check className="w-3 h-3 text-gray-500" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicators */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-gray-400">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview bar */}
            {attachment && (
              <div className="p-3.5 bg-indigo-600/10 border-t border-white/5 flex items-center justify-between gap-3 text-[10px]">
                <div className="flex items-center gap-2 font-mono">
                  <Paperclip className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <div>
                    <span className="text-white font-bold">{attachment.name}</span>
                    <span className="text-gray-500 ml-2">({attachment.size}) ready to upload</span>
                  </div>
                </div>
                <button
                  onClick={() => setAttachment(null)}
                  className="p-1 bg-white/10 hover:bg-rose-500 text-gray-300 hover:text-white rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/10 flex gap-2.5 items-center shrink-0">
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer relative"
                title="Attach file / image"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> : <Paperclip className="w-4 h-4 text-indigo-400" />}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,application/msword,text/*"
              />

              <input
                type="text"
                value={newMessage}
                onChange={handleTypingChange}
                placeholder="Type your message securely..."
                className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 placeholder-gray-500 text-xs"
              />

              <button
                type="submit"
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer font-bold shadow-lg flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-white font-extrabold text-sm">Real-time Encrypted Chats</h4>
              <p className="max-w-xs text-[10px] text-gray-400">
                Select a conversation from the list or initiate a direct chat with agencies, candidates, and employers in the active dashboard directory.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Directory Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0b0b10] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-white text-sm">Select Sourcing Partner / Candidate</h4>
              <button 
                onClick={() => setShowUsersModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer font-black"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-white/5 border border-white/5 rounded-xl">
              {availableUsers.length > 0 ? (
                availableUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      handleInitiateNewChat(u.id, u.name, u.role);
                      setShowUsersModal(false);
                    }}
                    className="w-full p-3 hover:bg-indigo-600/10 text-left flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-white">{u.name}</p>
                      <p className="text-[10px] text-gray-500">ID: {u.id.substr(0, 10).toUpperCase()}</p>
                    </div>
                    <span className="bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-[8px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                      {u.role}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 italic">No available users found in directory.</div>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
