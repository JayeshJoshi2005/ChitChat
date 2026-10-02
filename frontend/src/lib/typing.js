export const EMPTY_TYPING_USERS = [];

export function formatTypingLabel(users) {
  const names = users.map((user) => user.senderName);
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return names.length > 2 ? `${names[0]} and ${names.length - 1} others are typing…` : "";
}
