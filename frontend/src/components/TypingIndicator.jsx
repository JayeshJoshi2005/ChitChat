import { useChatStore } from "../store/useChatStore";
import { EMPTY_TYPING_USERS, formatTypingLabel } from "../lib/typing";
import TypingDots from "./TypingDots";

const TypingIndicator = () => {
  const typingUsers = useChatStore((state) => state.typingByConversation[
    state.selectedGroup ? `group:${state.selectedGroup._id}` : `user:${state.selectedUser?._id}`
  ] || EMPTY_TYPING_USERS);
  const label = formatTypingLabel(typingUsers);

  return (
    <div className="flex h-7 shrink-0 items-center gap-2 bg-base-100 px-4 text-xs text-base-content/60 sm:px-6" role="status" aria-live="polite" aria-atomic="true">
      {label && <>
        <TypingDots />
        <span className="truncate">{label}</span>
      </>}
    </div>
  );
};

export default TypingIndicator;
