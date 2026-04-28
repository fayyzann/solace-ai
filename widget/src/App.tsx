import ChatWidget from "./components/ChatWidget";

export default function App() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  return <ChatWidget token={token} />;
}
