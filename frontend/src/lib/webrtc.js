const defaultIceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function getIceServers(config = import.meta.env.VITE_ICE_SERVERS) {
  if (!config) return defaultIceServers;
  try {
    const servers = JSON.parse(config);
    if (!Array.isArray(servers) || !servers.length || servers.some((server) => {
      const urls = typeof server?.urls === "string" ? [server.urls] : server?.urls;
      return !Array.isArray(urls) || !urls.length || urls.some((url) => typeof url !== "string" || !/^(stun|stuns|turn|turns):/.test(url));
    })) throw new Error("Invalid ICE servers");
    return servers;
  } catch {
    throw new Error("The call network settings are invalid. Ask the app administrator to check them.");
  }
}
