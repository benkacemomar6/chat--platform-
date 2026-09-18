import Link from "next/link";

export default function Home() {
  return <main className="mx-auto max-w-2xl space-y-5 p-8">
    <h1 className="text-3xl font-bold">Chat Platform</h1>
    <p>A simple chat demo powered by microservices, gRPC, Socket.IO, Redis, and RabbitMQ.</p>
    <div className="flex gap-4">
      <Link className="rounded bg-gray-800 px-4 py-2 text-white" href="/login">Login</Link>
      <Link className="rounded border px-4 py-2" href="/register">Register</Link>
      <Link className="rounded border px-4 py-2" href="/chat">Open chat</Link>
    </div>
  </main>;
}
