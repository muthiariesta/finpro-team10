import TypingText from "@/components/TypingText";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
      <h1 className="text-4xl font-bold tracking-tight text-pink-700 sm:text-6xl md:text-7xl">
        SafeHer
      </h1>

      <TypingText
        text="is coming soon"
        className="mt-4 block text-lg font-medium text-pink-700 sm:text-2xl md:text-3xl"
      />

      <p className="mt-10 text-sm text-pink-600 sm:text-base">
        Proudly presented by Team 10 Sistech Portfolio Program
      </p>
    </main>
  );
}
