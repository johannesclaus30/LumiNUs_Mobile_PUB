import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { AppState } from "react-native";
import { getCurrentUser } from "../services/supabaseAuth";
import { getUnreadMessageCount } from "../services/messageQueries";

const UnreadMessagesContext = createContext({
  unreadCount: 0,
  refreshUnreadMessages: async () => 0,
  setUnreadCount: () => {}, // Exposed for instant local overrides
});

export const UnreadMessagesProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  // --- 🔥 DEBOUNCE TIMER REF ---
  const debounceTimer = useRef(null);

  const refreshUnreadMessages = useCallback(() => {
    return new Promise((resolve) => {
      // Clear any existing timer to prevent rapid-fire database queries
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Delay the database query by 800ms.
      // This ensures that if a screen just called "markAsRead", 
      // the database has fully saved it BEFORE we ask for the new count.
      debounceTimer.current = setTimeout(async () => {
        try {
          const user = await getCurrentUser();
          if (!user?.id) {
            setUnreadCount(0);
            return resolve(0);
          }

          const count = await getUnreadMessageCount(user.id).catch((err) => {
            console.error("Failed to fetch unread count:", err);
            return 0;
          });

          const normalizedUnreadCount = Number.isFinite(count) ? count : 0;
          setUnreadCount(normalizedUnreadCount);
          resolve(normalizedUnreadCount);
        } catch (error) {
          console.error("Failed to fetch unread message count:", error);
          setUnreadCount(0);
          resolve(0);
        }
      }, 800);
    });
  }, []);

  useEffect(() => {
    void refreshUnreadMessages();
  }, [refreshUnreadMessages]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void refreshUnreadMessages();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [refreshUnreadMessages]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void refreshUnreadMessages();
      }
    });

    return () => subscription.remove();
  }, [refreshUnreadMessages]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadMessages,
      setUnreadCount, // Now any screen can forcefully change the badge instantly
    }),
    [unreadCount, refreshUnreadMessages],
  );

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessages = () => useContext(UnreadMessagesContext);