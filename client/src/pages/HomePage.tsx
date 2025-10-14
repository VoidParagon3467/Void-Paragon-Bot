export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="relative h-96 rounded-lg overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-purple-900/30" />
        <div className="relative h-full flex flex-col items-center justify-center text-center p-8">
          <h1 className="font-serif text-5xl md:text-6xl text-primary mb-4">Vøid Pæragon</h1>
          <p className="text-xl text-foreground mb-6">Writer of Novels and Codes — I Write for Legends</p>
          <p className="text-muted-foreground max-w-2xl">
            Welcome to a digital sanctum where imagination meets precision.
            Stories unfold across dimensions, and code breathes life into new worlds.
          </p>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="font-serif text-3xl text-primary mb-6">Latest Novels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4 hover-elevate">
              <div className="aspect-[2/3] bg-gradient-to-br from-primary/20 to-purple-900/40 rounded-md mb-4" />
              <h3 className="font-serif text-lg text-primary mb-2">Featured Novel {i}</h3>
              <p className="text-sm text-muted-foreground">Click to read more...</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
